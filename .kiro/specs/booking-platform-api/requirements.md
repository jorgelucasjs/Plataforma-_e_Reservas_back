# Requirements Document

## Introduction

This document outlines the requirements for a RESTful API for a booking platform where clients can make reservations for different services. The platform will manage users (clients and service providers), handle booking creation and cancellation, and maintain booking history. The API will be built using Express.js with Firebase Firestore as the database, implementing JWT authentication and proper authorization controls.

## Requirements

### Requirement 1

**User Story:** As a new user, I want to register on the platform with my personal information, so that I can access the booking services as either a client or service provider.

#### Acceptance Criteria

1. WHEN a user submits registration data THEN the system SHALL validate that the name, NIF, email, and password are provided
2. WHEN a user registers with an email THEN the system SHALL verify that the email is unique in the database
3. WHEN a user registers with a NIF THEN the system SHALL verify that the NIF is unique in the database
4. WHEN a user registers THEN the system SHALL allow them to specify their user type as either "Client" or "Service Provider"
5. WHEN registration is successful THEN the system SHALL store the user data in Firestore and return a success response
6. WHEN registration fails due to duplicate email or NIF THEN the system SHALL return an appropriate error message

### Requirement 2

**User Story:** As a registered user, I want to authenticate with my credentials, so that I can securely access the platform's protected features.

#### Acceptance Criteria

1. WHEN a user submits login credentials THEN the system SHALL validate the email and password against stored data
2. WHEN authentication is successful THEN the system SHALL generate and return a JWT token
3. WHEN authentication fails THEN the system SHALL return an unauthorized error message
4. WHEN a JWT token is provided in requests THEN the system SHALL validate the token and extract user information
5. WHEN a JWT token is expired or invalid THEN the system SHALL return an authentication error

### Requirement 3

**User Story:** As a service provider, I want to register and manage my services, so that clients can discover and book them.

#### Acceptance Criteria

1. WHEN a service provider creates a service THEN the system SHALL require name, description, and price fields
2. WHEN a service is created THEN the system SHALL associate it with the authenticated service provider
3. WHEN a service provider requests their services THEN the system SHALL return only services they own
4. WHEN a service provider updates a service THEN the system SHALL verify they own the service before allowing modifications
5. WHEN a service provider deletes a service THEN the system SHALL verify ownership and prevent deletion if active bookings exist

### Requirement 4

**User Story:** As a client, I want to browse available services, so that I can choose which ones to book.

#### Acceptance Criteria

1. WHEN a client requests available services THEN the system SHALL return all active services with provider information
2. WHEN service details are requested THEN the system SHALL include service name, description, price, and provider details
3. WHEN services are listed THEN the system SHALL exclude services from inactive providers
4. WHEN a client searches services THEN the system SHALL support filtering by name or description

### Requirement 5

**User Story:** As a client, I want to make reservations for services, so that I can secure the services I need.

#### Acceptance Criteria

1. WHEN a client creates a booking THEN the system SHALL verify the client has sufficient balance
2. WHEN a booking is created THEN the system SHALL atomically deduct the service price from client balance
3. WHEN a booking is created THEN the system SHALL atomically add the service price to provider balance
4. WHEN a booking is successful THEN the system SHALL create a booking record with client, service, and timestamp
5. WHEN a client has insufficient balance THEN the system SHALL return an error without creating the booking
6. WHEN a booking is created THEN the system SHALL assign it a unique booking ID and "confirmed" status

### Requirement 6

**User Story:** As a user, I want to view and manage my bookings, so that I can track my reservations and cancel them if needed.

#### Acceptance Criteria

1. WHEN a client requests their bookings THEN the system SHALL return only bookings they created
2. WHEN a service provider requests bookings THEN the system SHALL return only bookings for their services
3. WHEN a booking is cancelled by the client THEN the system SHALL verify the booking belongs to them
4. WHEN a booking is cancelled THEN the system SHALL atomically refund the client and deduct from provider balance
5. WHEN a booking is cancelled THEN the system SHALL update the booking status to "cancelled"
6. WHEN booking details are requested THEN the system SHALL include service information and current status

### Requirement 7

**User Story:** As a platform administrator, I want to maintain a complete history of all bookings, so that I can track platform activity and resolve disputes.

#### Acceptance Criteria

1. WHEN any booking is created THEN the system SHALL record it in the booking history
2. WHEN any booking is cancelled THEN the system SHALL update the history record with cancellation details
3. WHEN booking history is requested THEN the system SHALL include all booking state changes
4. WHEN a booking status changes THEN the system SHALL timestamp the change in the history
5. WHEN booking history is queried THEN the system SHALL support filtering by date range and user

### Requirement 8

**User Story:** As a system administrator, I want proper authorization controls, so that users can only access and modify data they're permitted to.

#### Acceptance Criteria

1. WHEN a user accesses protected endpoints THEN the system SHALL verify they have a valid JWT token
2. WHEN a user attempts to modify a resource THEN the system SHALL verify they own the resource or have appropriate permissions
3. WHEN a client attempts service provider actions THEN the system SHALL deny access with appropriate error
4. WHEN a service provider attempts to access other providers' data THEN the system SHALL deny access
5. WHEN unauthorized access is attempted THEN the system SHALL log the attempt and return a forbidden error

### Requirement 9

**User Story:** As a user, I want balance management functionality, so that I can track my financial transactions on the platform.

#### Acceptance Criteria

1. WHEN a new client registers THEN the system SHALL initialize their balance to zero
2. WHEN a new service provider registers THEN the system SHALL initialize their balance to zero
3. WHEN a user requests their balance THEN the system SHALL return their current balance amount
4. WHEN balance updates occur THEN the system SHALL ensure atomic operations to prevent race conditions
5. WHEN balance operations fail THEN the system SHALL rollback any partial changes to maintain data consistency

### Requirement 10

**User Story:** As a developer, I want proper error handling and validation, so that the API provides clear feedback and maintains data integrity.

#### Acceptance Criteria

1. WHEN invalid data is submitted THEN the system SHALL return specific validation error messages
2. WHEN database operations fail THEN the system SHALL return appropriate error responses
3. WHEN concurrent operations conflict THEN the system SHALL handle race conditions gracefully
4. WHEN system errors occur THEN the system SHALL log errors for debugging while returning safe error messages to clients
5. WHEN API endpoints are called with invalid methods THEN the system SHALL return method not allowed errors