# User Data Models and Validation

This module implements comprehensive user data models and validation for the booking platform API.

## Implemented Components

### 1. User Data Models (`models/user.ts`)
- **User**: Core user interface with all required fields
- **CreateUserData**: Interface for user creation (without generated fields)
- **UpdateUserData**: Interface for user updates (partial fields)
- **PublicUserData**: Interface for public user data (without sensitive information)
- **UserRegistrationRequest**: Interface for registration requests
- **UserLoginRequest**: Interface for login requests
- **UserRegistrationResponse**: Interface for registration responses
- **UserLoginResponse**: Interface for login responses
- **BalanceUpdateOperation**: Interface for balance operations

### 2. Format Validation (`validation/userValidation.ts`)
- **validateUserRegistration()**: Validates registration data format
- **validateUserLogin()**: Validates login data format
- **validateEmail()**: Validates email format
- **validateNIF()**: Validates Portuguese NIF format (9 digits)
- **validatePassword()**: Validates password strength requirements
- **sanitizeUserRegistrationData()**: Sanitizes registration input
- **sanitizeUserLoginData()**: Sanitizes login input

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

#### Email Validation
- Standard email format validation
- Maximum 254 characters
- Normalized to lowercase

#### NIF Validation
- Exactly 9 digits
- Portuguese tax identification number format

### 3. Uniqueness Validation (`validation/uniquenessValidation.ts`)
- **validateEmailUniqueness()**: Checks email uniqueness in Firestore
- **validateNIFUniqueness()**: Checks NIF uniqueness in Firestore
- **validateUserUniqueness()**: Validates both email and NIF uniqueness
- **checkUserExistsByEmail()**: Checks if user exists by email
- **checkUserExistsById()**: Checks if user exists by ID
- **batchValidateUserUniqueness()**: Batch validation for multiple users

### 4. Comprehensive Validation Utils (`utils/userValidationUtils.ts`)
- **validateUserRegistrationComprehensive()**: Complete registration validation
- **validateUserLoginComprehensive()**: Complete login validation
- **validateUserUpdateComprehensive()**: Complete update validation
- **createValidationErrorResponse()**: Creates standardized error responses
- **extractAllValidationErrors()**: Extracts all validation errors

## Usage Examples

### Registration Validation
```typescript
import { validateUserRegistrationComprehensive } from '../utils/userValidationUtils';

const registrationData = {
  fullName: 'João Silva',
  nif: '123456789',
  email: 'joao@example.com',
  password: 'Password123!',
  userType: 'client'
};

const result = await validateUserRegistrationComprehensive(registrationData);
if (!result.isValid) {
  // Handle validation errors
  const errorResponse = createValidationErrorResponse(result);
  return res.status(400).json(errorResponse);
}
```

### Login Validation
```typescript
import { validateUserLoginComprehensive } from '../utils/userValidationUtils';

const loginData = {
  email: 'joao@example.com',
  password: 'Password123!'
};

const result = await validateUserLoginComprehensive(loginData);
if (!result.isValid) {
  // Handle validation errors
}
```

### Uniqueness Validation
```typescript
import { validateUserUniqueness } from '../validation/uniquenessValidation';

const [emailResult, nifResult] = await validateUserUniqueness(
  'joao@example.com',
  '123456789'
);

if (!emailResult.isUnique) {
  // Email already exists
}
if (!nifResult.isUnique) {
  // NIF already exists
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.1**: User registration with name, NIF, email, and password validation
- **Requirement 1.2**: Email uniqueness validation
- **Requirement 1.3**: NIF uniqueness validation
- **Requirement 10.1**: Proper error handling and validation with specific error messages

## Error Handling

All validation functions provide detailed error information including:
- Field name where error occurred
- Error message describing the issue
- Error code for programmatic handling
- Additional details when applicable

## Database Integration

The uniqueness validation functions integrate with Firestore to:
- Query existing users by email and NIF
- Support exclusion of specific user IDs (for updates)
- Handle only active users in uniqueness checks
- Provide efficient batch validation capabilities