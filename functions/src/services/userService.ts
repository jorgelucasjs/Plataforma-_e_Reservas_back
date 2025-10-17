import * as admin from 'firebase-admin';
import { 
  User, 
  CreateUserData, 
  PublicUserData,
  UserRegistrationRequest,
  UserLoginRequest,
  UserRegistrationResponse,
  UserLoginResponse
} from '../models/user';
import { UserType } from '../types/auth';
import { hashPassword, verifyPassword } from '../utils/passwordUtils';
import { generateToken } from '../utils/jwtUtils';
import { validateUserRegistrationComprehensive, validateUserLoginComprehensive } from '../utils/userValidationUtils';
import { DatabaseMonitor } from '../utils/monitoring';

/**
 * User Service Interface
 */
export interface UserService {
  register(userData: UserRegistrationRequest): Promise<UserRegistrationResponse>;
  authenticate(email: string, password: string): Promise<UserLoginResponse>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByNIF(nif: string): Promise<User | null>;
  updateBalance(userId: string, amount: number, transaction?: FirebaseFirestore.Transaction): Promise<void>;
  getPublicUserData(user: User): PublicUserData;
}

/**
 * User Service Implementation
 */
export class UserServiceImpl implements UserService {
  private db: FirebaseFirestore.Firestore;
  private usersCollection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = admin.firestore();
    this.usersCollection = this.db.collection('users');
  }

  /**
   * Register a new user
   */
  async register(userData: UserRegistrationRequest): Promise<UserRegistrationResponse> {
    try {
      // Comprehensive validation (format + uniqueness)
      const validationResult = await validateUserRegistrationComprehensive(userData);
      
      if (!validationResult.isValid) {
        const errors = [];
        
        // Add format errors
        if (validationResult.formatValidation.errors.length > 0) {
          errors.push(...validationResult.formatValidation.errors.map(e => e.message));
        }
        
        // Add uniqueness errors
        if (validationResult.uniquenessValidation) {
          const uniquenessErrors = validationResult.uniquenessValidation
            .filter(result => !result.isUnique)
            .map(result => result.message || `${result.field} already exists`);
          errors.push(...uniquenessErrors);
        }
        
        return {
          success: false,
          message: 'Registration failed due to validation errors',
          error: errors.join(', ')
        };
      }

      const sanitizedData = validationResult.sanitizedData as UserRegistrationRequest;

      // Hash password
      const passwordHash = await hashPassword(sanitizedData.password);

      // Create user document
      const userDoc = this.usersCollection.doc();
      const now = new Date();
      
      const createUserData: CreateUserData = {
        fullName: sanitizedData.fullName,
        nif: sanitizedData.nif,
        email: sanitizedData.email,
        passwordHash,
        userType: sanitizedData.userType,
        balance: 0, // Initialize balance to 0 as per requirement 9.1 and 9.2
        isActive: true
      };

      const userRecord: User = {
        id: userDoc.id,
        fullName: createUserData.fullName,
        nif: createUserData.nif,
        email: createUserData.email,
        passwordHash: createUserData.passwordHash,
        userType: createUserData.userType,
        balance: createUserData.balance || 0,
        isActive: createUserData.isActive !== false,
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore with monitoring
      await DatabaseMonitor.monitor(
        'create',
        'users',
        userDoc.id,
        async () => {
          await userDoc.set({
            ...createUserData,
            createdAt: admin.firestore.Timestamp.fromDate(now),
            updatedAt: admin.firestore.Timestamp.fromDate(now)
          });
        },
        userRecord.id,
        userRecord.userType
      );

      // Generate JWT token
      const tokenResult = generateToken({
        userId: userRecord.id,
        email: userRecord.email,
        userType: userRecord.userType
      });

      // Return success response
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          token: tokenResult.token,
          expiresIn: tokenResult.expiresIn,
          user: this.getPublicUserData(userRecord)
        }
      };

    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        message: 'Registration failed due to server error',
        error: 'Internal server error'
      };
    }
  }

  /**
   * Authenticate user and return JWT token
   */
  async authenticate(email: string, password: string): Promise<UserLoginResponse> {
    try {
      // Validate login data
      const loginData: UserLoginRequest = { email, password };
      const validationResult = await validateUserLoginComprehensive(loginData);
      
      if (!validationResult.isValid) {
        const errors = validationResult.formatValidation.errors.map(e => e.message);
        return {
          success: false,
          message: 'Authentication failed due to validation errors',
          error: errors.join(', ')
        };
      }

      const sanitizedData = validationResult.sanitizedData as UserLoginRequest;

      // Find user by email
      const user = await this.getUserByEmail(sanitizedData.email);
      
      if (!user) {
        return {
          success: false,
          message: 'Authentication failed',
          error: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Authentication failed',
          error: 'Account is inactive'
        };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(sanitizedData.password, user.passwordHash);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Authentication failed',
          error: 'Invalid email or password'
        };
      }

      // Generate JWT token
      const tokenResult = generateToken({
        userId: user.id,
        email: user.email,
        userType: user.userType
      });

      return {
        success: true,
        message: 'Authentication successful',
        data: {
          token: tokenResult.token,
          expiresIn: tokenResult.expiresIn,
          user: this.getPublicUserData(user)
        }
      };

    } catch (error) {
      console.error('Error authenticating user:', error);
      return {
        success: false,
        message: 'Authentication failed due to server error',
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await DatabaseMonitor.monitor(
        'read',
        'users',
        userId,
        async () => await this.usersCollection.doc(userId).get(),
        userId
      );
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      if (!userData) {
        return null;
      }

      return {
        id: userDoc.id,
        fullName: userData.fullName,
        nif: userData.nif,
        email: userData.email,
        passwordHash: userData.passwordHash,
        userType: userData.userType as UserType,
        balance: userData.balance || 0,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        isActive: userData.isActive !== false // Default to true if not specified
      };

    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const querySnapshot = await this.usersCollection
        .where('email', '==', email.toLowerCase().trim())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      return {
        id: userDoc.id,
        fullName: userData.fullName,
        nif: userData.nif,
        email: userData.email,
        passwordHash: userData.passwordHash,
        userType: userData.userType as UserType,
        balance: userData.balance || 0,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        isActive: userData.isActive !== false
      };

    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to retrieve user by email');
    }
  }

  /**
   * Get user by NIF
   */
  async getUserByNIF(nif: string): Promise<User | null> {
    try {
      const querySnapshot = await this.usersCollection
        .where('nif', '==', nif.trim())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      return {
        id: userDoc.id,
        fullName: userData.fullName,
        nif: userData.nif,
        email: userData.email,
        passwordHash: userData.passwordHash,
        userType: userData.userType as UserType,
        balance: userData.balance || 0,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        isActive: userData.isActive !== false
      };

    } catch (error) {
      console.error('Error getting user by NIF:', error);
      throw new Error('Failed to retrieve user by NIF');
    }
  }

  /**
   * Update user balance atomically
   * Supports both standalone operations and transactions
   */
  async updateBalance(
    userId: string, 
    amount: number, 
    transaction?: FirebaseFirestore.Transaction
  ): Promise<void> {
    try {
      const userRef = this.usersCollection.doc(userId);

      if (transaction) {
        // Use provided transaction
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        if (!userData) {
          throw new Error('User data not found');
        }

        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + amount;

        if (newBalance < 0) {
          throw new Error('Insufficient balance');
        }

        transaction.update(userRef, {
          balance: newBalance,
          updatedAt: admin.firestore.Timestamp.now()
        });

      } else {
        // Create new transaction
        await this.db.runTransaction(async (t) => {
          const userDoc = await t.get(userRef);
          
          if (!userDoc.exists) {
            throw new Error('User not found');
          }

          const userData = userDoc.data();
          if (!userData) {
            throw new Error('User data not found');
          }

          const currentBalance = userData.balance || 0;
          const newBalance = currentBalance + amount;

          if (newBalance < 0) {
            throw new Error('Insufficient balance');
          }

          t.update(userRef, {
            balance: newBalance,
            updatedAt: admin.firestore.Timestamp.now()
          });
        });
      }

    } catch (error) {
      console.error('Error updating user balance:', error);
      throw error;
    }
  }

  /**
   * Convert User to PublicUserData (remove sensitive information)
   */
  getPublicUserData(user: User): PublicUserData {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      balance: user.balance,
      createdAt: user.createdAt,
      isActive: user.isActive
    };
  }
}

// Export singleton instance
export const userService = new UserServiceImpl();