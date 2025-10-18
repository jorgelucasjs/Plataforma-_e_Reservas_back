import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

import { BalanceTransaction } from '../models/booking';
import { userService } from './userService';

/**
 * Balance operation types
 */
export type BalanceOperationType = 'debit' | 'credit';

/**
 * Balance operation result
 */
export interface BalanceOperationResult {
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  transactionId?: string;
  error?: string;
}

/**
 * Atomic balance operation data
 */
export interface AtomicBalanceOperation {
  userId: string;
  amount: number;
  type: BalanceOperationType;
  description: string;
  bookingId?: string;
  metadata?: Record<string, any>;
}

/**
 * Multi-user balance operation (for booking transactions)
 */
export interface MultiUserBalanceOperation {
  operations: AtomicBalanceOperation[];
  bookingId: string;
  description: string;
}

/**
 * Balance verification result
 */
export interface BalanceVerificationResult {
  isValid: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall?: number;
  error?: string;
}

/**
 * Balance Service Interface
 */
export interface BalanceService {
  verifyBalance(userId: string, requiredAmount: number): Promise<BalanceVerificationResult>;
  executeAtomicOperation(operation: AtomicBalanceOperation): Promise<BalanceOperationResult>;
  executeMultiUserOperation(operation: MultiUserBalanceOperation): Promise<BalanceOperationResult[]>;
  getBalanceHistory(userId: string, limit?: number): Promise<BalanceTransaction[]>;
  rollbackOperation(transactionId: string): Promise<boolean>;
}

/**
 * Balance Service Implementation
 */
export class BalanceServiceImpl implements BalanceService {
  private db: FirebaseFirestore.Firestore;
  private transactionsCollection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = admin.firestore();
    this.transactionsCollection = this.db.collection('balance_transactions');
  }

  /**
   * Verify if user has sufficient balance for a transaction
   */
  async verifyBalance(userId: string, requiredAmount: number): Promise<BalanceVerificationResult> {
    try {
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return {
          isValid: false,
          currentBalance: 0,
          requiredAmount,
          error: 'User not found'
        };
      }

      if (!user.isActive) {
        return {
          isValid: false,
          currentBalance: user.balance,
          requiredAmount,
          error: 'User account is inactive'
        };
      }

      const isValid = user.balance >= requiredAmount;
      const shortfall = isValid ? undefined : requiredAmount - user.balance;

      return {
        isValid,
        currentBalance: user.balance,
        requiredAmount,
        shortfall,
        error: isValid ? undefined : 'Insufficient balance'
      };

    } catch (error) {
      console.error('Error verifying balance:', error);
      return {
        isValid: false,
        currentBalance: 0,
        requiredAmount,
        error: 'Failed to verify balance'
      };
    }
  }

  /**
   * Execute atomic balance operation with transaction safety
   */
  async executeAtomicOperation(operation: AtomicBalanceOperation): Promise<BalanceOperationResult> {
    try {
      const userRef = this.db.collection('users').doc(operation.userId);
      let result: BalanceOperationResult;

      await this.db.runTransaction(async (transaction) => {
        // Get current user data
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        if (!userData) {
          throw new Error('User data not found');
        }

        if (!userData.isActive) {
          throw new Error('User account is inactive');
        }

        const currentBalance = userData.balance || 0;
        let newBalance: number;

        // Calculate new balance based on operation type
        if (operation.type === 'debit') {
          newBalance = currentBalance - Math.abs(operation.amount);
          
          // Verify sufficient balance for debit operations
          if (newBalance < 0) {
            throw new Error(`Insufficient balance. Current: ${currentBalance}, Required: ${Math.abs(operation.amount)}`);
          }
        } else {
          newBalance = currentBalance + Math.abs(operation.amount);
        }

        // Ensure balance precision (2 decimal places)
        newBalance = Math.round(newBalance * 100) / 100;

        // Update user balance
        transaction.update(userRef, {
          balance: newBalance,
          updatedAt: new Date().getTime()
        });

        // Create balance transaction record
        const transactionDoc = this.transactionsCollection.doc();
        const balanceTransaction: Omit<BalanceTransaction, 'id'> = {
          userId: operation.userId,
          bookingId: operation.bookingId || '',
          amount: Math.abs(operation.amount),
          type: operation.type,
          description: operation.description,
          timestamp: new Date(),
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        };

        transaction.set(transactionDoc, {
          ...balanceTransaction,
          timestamp: new Date().getTime()
        });

        result = {
          success: true,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          transactionId: transactionDoc.id
        };
      });

      return result!;

    } catch (error) {
      console.error('Error executing atomic balance operation:', error);
      return {
        success: false,
        balanceBefore: 0,
        balanceAfter: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Execute multi-user balance operation (e.g., booking payment)
   * This ensures all operations succeed or all fail (atomicity)
   */
  async executeMultiUserOperation(operation: MultiUserBalanceOperation): Promise<BalanceOperationResult[]> {
    try {
      const results: BalanceOperationResult[] = [];
      const userRefs = operation.operations.map(op => this.db.collection('users').doc(op.userId));

      await this.db.runTransaction(async (transaction) => {
        // Get all user documents
        const userDocs = await Promise.all(
          userRefs.map(ref => transaction.get(ref))
        );

        // Validate all users exist and are active
        for (let i = 0; i < userDocs.length; i++) {
          const userDoc = userDocs[i];
          const op = operation.operations[i];

          if (!userDoc.exists) {
            throw new Error(`User ${op.userId} not found`);
          }

          const userData = userDoc.data();
          if (!userData) {
            throw new Error(`User data for ${op.userId} not found`);
          }

          if (!userData.isActive) {
            throw new Error(`User account ${op.userId} is inactive`);
          }
        }

        // Calculate and validate all balance changes
        const balanceChanges: Array<{
          userRef: FirebaseFirestore.DocumentReference;
          currentBalance: number;
          newBalance: number;
          operation: AtomicBalanceOperation;
        }> = [];

        for (let i = 0; i < operation.operations.length; i++) {
          const op = operation.operations[i];
          const userDoc = userDocs[i];
          const userData = userDoc.data()!;
          const currentBalance = userData.balance || 0;

          let newBalance: number;
          if (op.type === 'debit') {
            newBalance = currentBalance - Math.abs(op.amount);
            
            if (newBalance < 0) {
              throw new Error(`Insufficient balance for user ${op.userId}. Current: ${currentBalance}, Required: ${Math.abs(op.amount)}`);
            }
          } else {
            newBalance = currentBalance + Math.abs(op.amount);
          }

          newBalance = Math.round(newBalance * 100) / 100;

          balanceChanges.push({
            userRef: userRefs[i],
            currentBalance,
            newBalance,
            operation: op
          });
        }

        // Execute all balance updates and create transaction records
        for (const change of balanceChanges) {
          // Update user balance
          transaction.update(change.userRef, {
            balance: change.newBalance,
            updatedAt: new Date().getTime()
          });

          // Create balance transaction record
          const transactionDoc = this.transactionsCollection.doc();
          const balanceTransaction: Omit<BalanceTransaction, 'id'> = {
            userId: change.operation.userId,
            bookingId: operation.bookingId,
            amount: Math.abs(change.operation.amount),
            type: change.operation.type,
            description: change.operation.description,
            timestamp: new Date(),
            balanceBefore: change.currentBalance,
            balanceAfter: change.newBalance
          };

          transaction.set(transactionDoc, {
            ...balanceTransaction,
            timestamp: new Date().getTime()
          });

          results.push({
            success: true,
            balanceBefore: change.currentBalance,
            balanceAfter: change.newBalance,
            transactionId: transactionDoc.id
          });
        }
      });

      return results;

    } catch (error) {
      console.error('Error executing multi-user balance operation:', error);
      
      // Return error results for all operations
      return operation.operations.map(() => ({
        success: false,
        balanceBefore: 0,
        balanceAfter: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }

  /**
   * Get balance transaction history for a user
   */
  async getBalanceHistory(userId: string, limit: number = 50): Promise<BalanceTransaction[]> {
    try {
      const querySnapshot = await this.transactionsCollection
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const transactions: BalanceTransaction[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          bookingId: data.bookingId,
          amount: data.amount,
          type: data.type,
          description: data.description,
          timestamp: data.timestamp?.toDate() || new Date(),
          balanceBefore: data.balanceBefore,
          balanceAfter: data.balanceAfter
        });
      });

      return transactions;

    } catch (error) {
      console.error('Error getting balance history:', error);
      throw new Error('Failed to retrieve balance history');
    }
  }

  /**
   * Rollback a balance operation (create compensating transaction)
   * Note: This creates a new transaction that reverses the original
   */
  async rollbackOperation(transactionId: string): Promise<boolean> {
    try {
      // Get the original transaction
      const transactionDoc = await this.transactionsCollection.doc(transactionId).get();
      
      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }

      const originalTransaction = transactionDoc.data();
      if (!originalTransaction) {
        throw new Error('Transaction data not found');
      }

      // Create compensating operation
      const compensatingOperation: AtomicBalanceOperation = {
        userId: originalTransaction.userId,
        amount: originalTransaction.amount,
        type: originalTransaction.type === 'debit' ? 'credit' : 'debit',
        description: `Rollback: ${originalTransaction.description}`,
        bookingId: originalTransaction.bookingId,
        metadata: {
          originalTransactionId: transactionId,
          rollbackReason: 'Manual rollback operation'
        }
      };

      const result = await this.executeAtomicOperation(compensatingOperation);
      return result.success;

    } catch (error) {
      console.error('Error rolling back operation:', error);
      return false;
    }
  }

  /**
   * Create booking payment operations (client debit + provider credit)
   */
  createBookingPaymentOperations(
    clientId: string,
    providerId: string,
    amount: number,
    bookingId: string,
    serviceName: string
  ): MultiUserBalanceOperation {
    return {
      operations: [
        {
          userId: clientId,
          amount,
          type: 'debit',
          description: `Payment for service: ${serviceName}`,
          bookingId
        },
        {
          userId: providerId,
          amount,
          type: 'credit',
          description: `Payment received for service: ${serviceName}`,
          bookingId
        }
      ],
      bookingId,
      description: `Booking payment for service: ${serviceName}`
    };
  }

  /**
   * Create booking refund operations (client credit + provider debit)
   */
  createBookingRefundOperations(
    clientId: string,
    providerId: string,
    amount: number,
    bookingId: string,
    serviceName: string
  ): MultiUserBalanceOperation {
    return {
      operations: [
        {
          userId: clientId,
          amount,
          type: 'credit',
          description: `Refund for cancelled booking: ${serviceName}`,
          bookingId
        },
        {
          userId: providerId,
          amount,
          type: 'debit',
          description: `Refund issued for cancelled booking: ${serviceName}`,
          bookingId
        }
      ],
      bookingId,
      description: `Booking refund for service: ${serviceName}`
    };
  }
}

// Export singleton instance
export const balanceService = new BalanceServiceImpl();