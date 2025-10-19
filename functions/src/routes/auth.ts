import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { UserRegistrationRequest, UserLoginRequest } from '../models/user';
import { ErrorResponse } from '../types/responses';
import { AuthenticatedRequest } from '../types/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/register - Registro de usuário
 * Requisito 1.1: Registro de usuário com validação
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const registrationData: UserRegistrationRequest = req.body;

        // Validar campos obrigatórios
        if (!registrationData.fullName || !registrationData.nif || !registrationData.email ||
            !registrationData.password || !registrationData.userType) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Validation Error',
                message: 'All fields are required: fullName, nif, email, password, userType'
            };
            return res.status(400).json(errorResponse);
        }

        // Validar userType
        if (!['client', 'provider'].includes(registrationData.userType)) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Validation Error',
                message: 'userType must be either "client" or "provider"'
            };
            return res.status(400).json(errorResponse);
        }

        // Chamar serviço de usuário para registrar usuário
        const result = await userService.register(registrationData);

        if (!result.success) {
            const statusCode = result.error?.includes('already exists') ||
                result.error?.includes('unique') ? 409 : 400;
            return res.status(statusCode).json(result);
        }

        // Retornar resposta de sucesso
        return res.status(201).json(result);

    } catch (error) {
        console.error('Registration endpoint error:', error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred during registration'
        };
        return res.status(500).json(errorResponse);
    }
});

/**
 * POST /auth/login - Autenticação de usuário
 * Requisito 2.1: Autenticação de usuário com geração de token JWT
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const loginData: UserLoginRequest = req.body;

        // Validate required fields
        if (!loginData.email || !loginData.password) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Validation Error',
                message: 'Email and password are required'
            };
            return res.status(400).json(errorResponse);
        }

        // Call user service to authenticate user
        const result = await userService.authenticate(loginData.email, loginData.password);

        if (!result.success) {
            const statusCode = result.error?.includes('Invalid email or password') ||
                result.error?.includes('Account is inactive') ? 401 : 400;
            return res.status(statusCode).json(result);
        }

        // Return success response
        return res.status(200).json(result);

    } catch (error) {
        console.error('Login endpoint error:', error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred during authentication'
        };
        return res.status(500).json(errorResponse);
    }
});

/**
 * POST /auth/add-balance - Adiciona valor ao campo balance do usuário identificado por email
 * Body: { email: string, amount: number }
 * Rota protegida (ex.: client). Ajuste as roles conforme necessidade.
 */
router.post('/add-balance', authenticateToken({ roles: ['client'] }), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email, amount } = req.body as { email?: string; amount?: number };

        // Validações básicas
        if (!email || amount === undefined) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Validation Error',
                message: 'Both email and amount are required'
            };
            return res.status(400).json(errorResponse);
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Validation Error',
                message: 'Amount must be a positive number'
            };
            return res.status(400).json(errorResponse);
        }

        // Chamar serviço de usuário — espera-se que userService implemente addBalanceByEmail
        // (email: string, amount: number, actorId?: string) => { success: boolean, ... }
        const result = await userService.addBalanceByEmail(email, numericAmount, req.user?.userId);

        if (!result || result.success === false) {
            const statusCode = result?.error?.toLowerCase().includes('not found') ? 404 : 400;
            return res.status(statusCode).json(result || {
                success: false,
                error: 'Operation Failed',
                message: 'Failed to add balance'
            });
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Add balance endpoint error:', error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while adding balance'
        };
        return res.status(500).json(errorResponse);
    }
});

export { router as authRoutes };