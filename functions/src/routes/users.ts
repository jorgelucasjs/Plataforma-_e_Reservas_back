import { Router, Response } from 'express';
import { userService } from '../services/userService';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ErrorResponse, UserProfileResponse, BalanceResponse } from '../types/responses';

const router = Router();

/**
 * GET /users/profile - Get current user profile
 * Requirement 9.3: User profile retrieval for authenticated users
 */
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // User context is injected by requireAuth middleware
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication Error',
        message: 'User context not found'
      };
      return res.status(401).json(errorResponse);
    }

    // Get full user data from database
    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not Found',
        message: 'User not found'
      };
      return res.status(404).json(errorResponse);
    }

    // Return user profile (excluding sensitive information)
    const profileResponse: UserProfileResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        nif: user.nif,
        userType: user.userType,
        balance: user.balance,
        createdAt: user.createdAt,
        isActive: user.isActive
      }
    };

    return res.status(200).json(profileResponse);

  } catch (error) {
    console.error('Get profile endpoint error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while retrieving user profile'
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /users/balance - Get current user balance
 * Requirement 9.3: User balance retrieval for authenticated users
 */
router.get('/balance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // User context is injected by requireAuth middleware
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication Error',
        message: 'User context not found'
      };
      return res.status(401).json(errorResponse);
    }

    // Get user data to retrieve current balance
    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not Found',
        message: 'User not found'
      };
      return res.status(404).json(errorResponse);
    }

    // Return user balance
    const balanceResponse: BalanceResponse = {
      success: true,
      message: 'User balance retrieved successfully',
      data: {
        balance: user.balance
      }
    };

    return res.status(200).json(balanceResponse);

  } catch (error) {
    console.error('Get balance endpoint error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while retrieving user balance'
    };
    return res.status(500).json(errorResponse);
  }
});

export { router as userRoutes };