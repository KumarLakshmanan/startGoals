# StartGoals LMS API Documentation

## Overview

StartGoals is a comprehensive Learning Management System (LMS) built with Node.js, Express, and PostgreSQL. This API provides complete functionality for managing courses, projects, users, payments, and more.

## Base URL
```
http://localhost:8080/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Default Credentials
- **Admin**: `admin@example.com` / `SecurePassword@123`
- **Teacher**: `teacher1@example.com` / `SecurePassword@123`
- **Student**: `student1@example.com` / `SecurePassword@123`

## API Endpoints

### Health Check
- **GET** `/health` - Server health check

### User Management

#### Authentication
- **POST** `/user/userRegistration` - Register new user
- **POST** `/user/userLogin` - User login
- **GET** `/user/auth/google/callback` - Google OAuth callback
- **GET** `/user/getUserDetails` - Get user details
- **PUT** `/user/updateProfile` - Update user profile

#### Admin Student Management
- **GET** `/user/admin/students` - Get all students (Admin only)
- **GET** `/user/admin/students/analytics` - Student analytics (Admin only)
- **GET** `/user/admin/students/:studentId` - Get student by ID (Admin only)
- **POST** `/user/admin/students/create` - Create student (Admin only)
- **PUT** `/user/admin/students/:studentId` - Update student (Admin only)
- **DELETE** `/user/admin/students/:studentId` - Delete student (Admin only)
- **DELETE** `/user/admin/students/bulk-delete` - Bulk delete students (Admin only)

### Course Management

#### Course CRUD
- **GET** `/courses/dashboard` - Admin dashboard courses
- **GET** `/courses/list` - List all courses (Admin)
- **GET** `/courses/live` - Get live courses
- **GET** `/courses/recorded` - Get recorded courses
- **POST** `/courses/create/live` - Create live course (Admin)
- **POST** `/courses/create/recorded` - Create recorded course (Admin)
- **GET** `/courses/:courseId` - Get course by ID
- **PUT** `/courses/:courseId` - Update course (Admin/Teacher)
- **DELETE** `/courses/:courseId` - Delete course (Admin/Teacher)

#### Course Features
- **GET** `/courses/:courseId/ratings/stats` - Course rating statistics
- **GET** `/courses/:courseId/reviews` - Course reviews
- **POST** `/courses/:courseId/reviews` - Create course review
- **GET** `/courses/:courseId/languages` - Course languages
- **POST** `/courses/:courseId/languages` - Add course languages (Admin)
- **DELETE** `/courses/:courseId/languages/:languageId` - Remove course language (Admin)
- **GET** `/courses/:courseId/instructors` - Course instructors
- **POST** `/courses/:courseId/instructors` - Add course instructors (Admin)
- **DELETE** `/courses/:courseId/instructors/:instructorId` - Remove course instructor (Admin)

### Project Management

#### Project CRUD
- **POST** `/projects/create` - Create project (Admin)
- **GET** `/projects/getAll` - Get all projects
- **GET** `/projects/get/:id` - Get project by ID
- **PUT** `/projects/update/:id` - Update project (Admin)
- **DELETE** `/projects/delete/:id` - Delete project (Admin)
- **DELETE** `/projects/bulk-delete` - Bulk delete projects (Admin)

#### Project Features
- **POST** `/projects/purchase` - Initiate project purchase
- **POST** `/projects/purchase/complete` - Complete project purchase
- **GET** `/projects/purchases/my` - Get user's purchased projects
- **GET** `/projects/statistics` - Project statistics (Admin)
- **GET** `/projects/:projectId/languages` - Project languages
- **POST** `/projects/:projectId/languages` - Add project languages (Admin)
- **DELETE** `/projects/:projectId/languages/:languageId` - Remove project language (Admin)
- **GET** `/projects/:projectId/instructors` - Project instructors
- **POST** `/projects/:projectId/instructors` - Add project instructors (Admin)
- **DELETE** `/projects/:projectId/instructors/:instructorId` - Remove project instructor (Admin)

### Lesson Management

#### Admin Lesson Management
- **POST** `/lesson/admin/create` - Create lesson (Admin)
- **PUT** `/lesson/admin/:lessonId` - Update lesson (Admin)
- **DELETE** `/lesson/admin/:lessonId` - Delete lesson (Admin)
- **POST** `/lesson/admin/bulk-update` - Bulk update lessons (Admin)

#### Teacher Lesson Management
- **POST** `/lesson/create` - Create lesson (Teacher)
- **PUT** `/lesson/:lessonId` - Update lesson (Teacher)
- **DELETE** `/lesson/:lessonId` - Delete lesson (Teacher)
- **PUT** `/lesson/:lessonId/content` - Update lesson content (Teacher)
- **PUT** `/lesson/:lessonId/preview` - Toggle lesson preview (Teacher)

#### Student Access
- **GET** `/lesson/section/:sectionId` - Get section lessons (Student)
- **GET** `/lesson/:lessonId` - Get lesson by ID (Student)
- **POST** `/lesson/:lessonId/complete` - Mark lesson complete (Student)
- **GET** `/lesson/:lessonId/progress` - Get lesson progress (Student)

#### Lesson Features
- **POST** `/lesson/section/:sectionId/reorder` - Reorder lessons (Teacher)
- **GET** `/lesson/:lessonId/analytics` - Lesson analytics (Teacher)

### Live Session Management

#### Session Management
- **POST** `/live-session/createLiveSession` - Create live session
- **PUT** `/live-session/:sessionId/start` - Start live session (Instructor)
- **PUT** `/live-session/:sessionId/end` - End live session (Instructor)
- **GET** `/live-session/:sessionId` - Get session details
- **GET** `/live-session/sessions` - List sessions

#### Participant Management
- **POST** `/live-session/:sessionId/join` - Join live session
- **POST** `/live-session/:sessionId/leave` - Leave live session
- **PUT** `/live-session/:sessionId/participants/:participantUserId/mic` - Toggle participant mic (Instructor)
- **PUT** `/live-session/:sessionId/participants/:participantUserId/camera` - Toggle participant camera (Instructor)
- **DELETE** `/live-session/:sessionId/participants/:participantUserId` - Remove participant (Instructor)

#### Raise Hand Feature
- **POST** `/live-session/:sessionId/raise-hand` - Raise hand (Student)
- **GET** `/live-session/:sessionId/raised-hands` - List raised hands (Instructor)
- **PUT** `/live-session/:sessionId/raised-hands/:raisedHandId/respond` - Respond to raised hand (Instructor)
- **PUT** `/live-session/:sessionId/raised-hands/:raisedHandId/end-interaction` - End interaction (Instructor)

### Wallet Management

#### Wallet Operations
- **GET** `/wallet/balance` - Get wallet balance
- **POST** `/wallet/add-balance` - Add wallet balance
- **POST** `/wallet/apply-coupon` - Apply coupon to wallet
- **GET** `/wallet/transactions` - Get wallet transactions

### News Management

#### News CRUD
- **GET** `/news/featured` - Get featured news
- **GET** `/news/:id` - Get news by ID
- **GET** `/news` - Get all news (Authenticated)
- **POST** `/news` - Create news (Admin)
- **PUT** `/news/:id` - Update news (Admin)
- **DELETE** `/news/:id` - Delete news (Admin)
- **PATCH** `/news/:id/toggle-status` - Toggle news status (Admin)

### Course Chat

#### Chat Management
- **POST** `/course-chat/:courseId/messages` - Send message
- **GET** `/course-chat/:courseId/messages` - Get course messages
- **POST** `/course-chat/:courseId/announcements` - Send announcement (Teacher)
- **DELETE** `/course-chat/messages/:messageId` - Delete message
- **GET** `/course-chat/unread-count` - Get unread message count

### File Upload

#### File Operations
- **POST** `/upload/upload-file` - Upload files
- **POST** `/upload/upload-fields` - Upload with fields

### Cart Management

#### Cart Operations
- **GET** `/cart` - Get user cart
- **POST** `/cart/add` - Add to cart
- **DELETE** `/cart/remove` - Remove from cart
- **PUT** `/cart/update` - Update cart item
- **DELETE** `/cart/clear` - Clear cart

### Wishlist Management

#### Wishlist Operations
- **GET** `/wishlist` - Get user wishlist
- **POST** `/wishlist/add` - Add to wishlist
- **DELETE** `/wishlist/remove` - Remove from wishlist

### Payment Management

#### Payment Operations
- **POST** `/payments/create-order` - Create payment order
- **GET** `/payments/status/:orderId` - Check payment status
- **POST** `/payments/webhook` - Payment webhook

### Discount Management

#### Discount Operations
- **GET** `/discounts` - Get all discounts
- **POST** `/discounts` - Create discount (Admin)
- **PUT** `/discounts/:id` - Update discount (Admin)
- **DELETE** `/discounts/:id` - Delete discount (Admin)
- **POST** `/discounts/validate` - Validate discount code

### Rating & Review System

#### Rating Operations
- **GET** `/ratings/courses/:courseId` - Get course ratings
- **POST** `/ratings/courses/:courseId` - Rate course
- **GET** `/ratings/projects/:projectId` - Get project ratings
- **POST** `/ratings/projects/:projectId` - Rate project
- **GET** `/ratings/instructors/:instructorId` - Get instructor ratings
- **POST** `/ratings/instructors/:instructorId` - Rate instructor

### Analytics

#### Analytics Operations
- **GET** `/analytics/dashboard` - Dashboard analytics
- **GET** `/analytics/courses` - Course analytics
- **GET** `/analytics/users` - User analytics
- **GET** `/analytics/revenue` - Revenue analytics

### Notification Management

#### Notification Operations
- **GET** `/notifications` - Get user notifications
- **PUT** `/notifications/:id/read` - Mark notification as read
- **DELETE** `/notifications/:id` - Delete notification

### Certificate Management

#### Certificate Operations
- **GET** `/certificates` - Get user certificates
- **GET** `/certificates/:id` - Get certificate by ID
- **POST** `/certificates/generate` - Generate certificate

### Search

#### Search Operations
- **GET** `/search/courses` - Search courses
- **GET** `/search/projects` - Search projects
- **GET** `/search/users` - Search users

### Settings

#### Settings Operations
- **GET** `/settings` - Get application settings
- **PUT** `/settings` - Update settings (Admin)

### Banner Management

#### Banner Operations
- **GET** `/banners/getAll` - Get all banners
- **POST** `/banners` - Create banner (Admin)
- **PUT** `/banners/:id` - Update banner (Admin)
- **DELETE** `/banners/:id` - Delete banner (Admin)

## Data Models

### User Model
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "mobile": "string",
  "role": "student|teacher|admin",
  "firstName": "string",
  "lastName": "string",
  "dob": "date",
  "bio": "string",
  "profileImage": "string",
  "isActive": "boolean",
  "onboarded": "boolean"
}
```

### Course Model
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "type": "live|recorded",
  "price": "number",
  "status": "active|inactive|draft",
  "levelId": "uuid",
  "categoryId": "uuid",
  "coverImage": "string",
  "screenshots": ["string"],
  "featured": "boolean",
  "discountEnabled": "boolean"
}
```

### Project Model
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "price": "number",
  "status": "active|inactive|draft",
  "levelId": "uuid",
  "categoryId": "uuid",
  "techStack": ["string"],
  "programmingLanguages": ["string"],
  "coverImage": "string",
  "screenshots": ["string"],
  "featured": "boolean",
  "discountEnabled": "boolean"
}
```

## Error Handling

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute
- File upload endpoints: 10 requests per minute

## File Upload

### Supported File Types
- **Images**: JPG, JPEG, PNG, GIF, SVG, WEBP
- **Videos**: MP4, AVI, MOV, WMV, FLV
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Archives**: ZIP, RAR, 7Z
- **Presentations**: PPT, PPTX
- **Spreadsheets**: XLS, XLSX
- **Audio**: MP3, WAV, AAC

### File Size Limits
- Images: 5MB
- Videos: 100MB
- Documents: 10MB
- Archives: 50MB

## Payment Integration

### Razorpay Configuration
- **Test Key ID**: `rzp_test_tqQfVSBUtw7Yju`
- **Test Key Secret**: `wH4TK2HioN3pNUYztWqf4xZ5`

### Payment Flow
1. Create order → 2. Initiate payment → 3. Complete payment → 4. Grant access

## Live Streaming

### Agora Integration
- Real-time video/audio communication
- Screen sharing capabilities
- Recording functionality

### Zoom Integration
- Scheduled meetings
- Webinar functionality
- Recording and analytics

## Media Processing

### AWS S3 Integration
- Secure file storage
- CDN delivery
- Access control

### FFmpeg Processing
- Video format conversion
- HLS streaming
- Thumbnail generation

## Security Features

- JWT authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- File upload security

## Development Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis (for caching)
- AWS S3 bucket
- Razorpay account
- Agora account
- Zoom account

### Installation
```bash
cd backend
npm install
```

### Environment Variables
```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/startgoals
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=eu-north-1
AWS_S3_BUCKET=startgoals
RAZORPAY_KEY_ID=rzp_test_tqQfVSBUtw7Yju
RAZORPAY_KEY_SECRET=wH4TK2HioN3pNUYztWqf4xZ5
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

### Running the Application
```bash
# Development
npm run dev

# Production
npm start
```

### Database Setup
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed
```

## Testing

### API Testing
```bash
npm test
```

### Load Testing
```bash
npm run load-test
```

## Deployment

### Docker
```bash
docker build -t startgoals-api .
docker run -p 8080:8080 startgoals-api
```

### PM2
```bash
pm2 start index.js --name startgoals-api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact:
- Email: support@startgoals.com
- Documentation: https://docs.startgoals.com
- Issues: https://github.com/startgoals/lms/issues