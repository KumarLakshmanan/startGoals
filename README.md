# startGoals

npm start
express
sequelize
jsonwebtoken
npm install passport bcrypt express-session
dotenv
cors
npm install passport-google-oauth20
npm install bcryptjs
pg pg-hstore
node-cron
joi
npm install multer multer-s3 aws-sdk
npm install agora-access-token
#to start the application
node index.js
Github work flow updated

# in developemnt to run the app

npm run dev









================================================================================
================================================================================
================================================================================
================================================================================
================================================================================







admin/teachers/0077a790-e771-4338-8360-746af659e949
view teacher page is not working.

admin/teachers/new
create new teacher is not working. and please match the fields with the backend user model

admin/students/new
create new student is not working. and please match the fields with the backend user model

admin/students/facfdd79-c966-4d74-95ec-2865b4d44f42/edit
student edit page is not loading the existing student data. and the save functionality is also not working

admin/teachers/0077a790-e771-4338-8360-746af659e949/edit
teacher edit page is not loading the existing teacher data. and the save functionality is also not working


so please change the frontend react code by refering the backend user models and controllers.

and also please fix the columns in the list of teachers and students table that match the backend user models.




================================================================================
================================================================================
================================================================================


admin/courses/live
Live courses list page is not working. and the live course list is not loading.

admin/courses/recorded
Recorded courses list page is not working. and the recorded course list is not loading.

also add page for live and recorded courses needs to be changed to match the backend course model and controllers.

and the edit for live and recorded courses is not working. so please fix the edit functionality for live and recorded courses. and the save functionality is also not working. and the default values are not loaded in the edit page.

please refer the projects add/edit/list page layout and try to match the design and layout like that for the live and recorded courses.


so please change the frontend react code by refering the backend user models and controllers.

and also please fix the columns in the list of live & recorded table that match the backend user models.

================================================================================
================================================================================
================================================================================

change the list of live & recorded courses page just like the admin/projects page.

and i need two pages for live and recorded courses list
admin/courses/live
admin/courses/recorded

also please fix the issues with the filters. and the layout to match the admin/projects page.


and please read the course models and add all the remaining fields to the live and recorded courses pages.
for reference view the admin/projects/new page.

try to add need all the fields there in the projects models to be added to the live and recorded courses pages. also implement the layout and design to match the admin/projects/new page.

in the live and recorded courses pages add a option to add sections & lessons to the courses.
- **Sections and lessons:** Allow dynamic add/remove of sections, and for each section, add/remove lessons.

just like the project new/edit page use the file uploaders, text editors and other components from the admin/projects/new page.



================================================================================
================================================================================
================================================================================


Please implement the following features for our Node.js/React application:

### 1. Razorpay Payment Integration
- Integrate Razorpay for payments using these test keys:
  - `key_id`: `rzp_test_tqQfVSBUtw7Yju`
  - `key_secret`: `wH4TK2HioN3pNUYztWqf4xZ5`
- Create backend APIs to:
  - Check payment status
  - Create Razorpay orders for live courses, recorded courses, and projects
  - Handle Razorpay webhook for order completion (update payment/order status on success)

### 2. Wishlist & Cart Functionality
- Implement backend APIs for:
  - Adding/removing items (courses/projects) to/from a user’s wishlist
  - Adding/removing items to/from a user’s cart
  - Viewing wishlist and cart contents

### 3. Checkout API
- Implement a checkout API that:
  - Initiates a Razorpay order for the items in the cart
  - Returns order details to the frontend for payment

### 4. Web Checkout Page
- Create a React checkout page that:
  - Displays order summary
  - Integrates Razorpay JS SDK for payment
  - Handles payment success/failure and updates backend accordingly

### 5. Routing & Models
- Ensure all APIs are properly routed and secured
- Create/update models for wishlist, cart, and orders as needed

### 6. Reference
- The features should work for live courses, recorded courses, and projects.
- Use the provided test keys for development.
- Follow best practices for error handling, security, and code organization.

---

**Goal:**  
A complete payment flow with wishlist, cart, checkout, Razorpay integration, and webhook handling for all course/project types.

---

1. **Save Razorpay API Keys Securely**
   - Store the Razorpay `key_id` and `key_secret` in the .env file (not in code).
   - Load these keys from environment variables in your backend payment integration.

2. **Grant User Access After Purchase**
   - After a user successfully completes payment for a course or project (via Razorpay), update the backend so:
     - The purchased course/project is saved to the user’s account (e.g., in a `UserCourses` or `UserProjects` table).
     - The user can access their purchased items from their profile/dashboard page.

3. **Access Control**
   - Ensure only users who have purchased a course/project can access/download/view it from their profile.

---

**Goal:**  
- Secure payment keys in .env.
- Automatically grant access to purchased courses/projects after payment.
- Users see and access their purchases in their profile.

---



================================================================================
================================================================================
================================================================================



Please refactor and update the codebase as follows:

1. **Combine Live Course Logic**
   - Merge the live course controller and routes into the main course controller and course routes.
   - Remove the separate live course controller and route files.
   - Ensure all live course features are handled within the unified course controller and routes.

2. **Frontend: Recorded Course Lesson Video Upload**
   - In the recorded course lesson add/edit form, replace the video URL input with a file upload field.
   - After uploading the video, use the uploaded file’s URL for the lesson.
   - Ensure the video upload and URL assignment work correctly in the UI and backend.

3. **Course API Connection Check**
   - Review all course-related APIs and ensure they are correctly connected and functional between frontend and backend.

4. **Combine Course Purchase Logic**
   - Merge the course purchase controller and routes into the payment controller and payment routes.
   - Remove the separate course purchase controller and route files.
   - Refactor the course purchase model: remove it or combine its logic into the order model.
   - Ensure all course purchase features are handled within the unified payment controller, routes, and order model.

---

**Goal:**  
- Simplified, unified controllers and routes for courses and payments.
- Video upload for recorded course lessons.
- All APIs are correctly connected and functional.



================================================================================
================================================================================
================================================================================



Please implement a comprehensive Discount System with the payment on courses and projects for our learning platform with the following requirements:

### 1. **Supported Modules**
- Discounts must work for:
  - Live Courses
  - Recorded Courses
  - Projects

### 2. **Discount Types**
- Support these discount types:
  - Percentage Discount (e.g., 20% off)
  - Flat Discount (e.g., ₹500 off)
  - Promo Code Based (user enters code)
  - Automatic Discounts (applied if eligible)
  - Time-Based Discounts (valid for a date range)
  - User-Specific Discounts (new users, loyal users, selected users)
  - Bulk Purchase Discounts (multiple courses)

### 3. **Admin Panel Features**
- Discount Management Menu:
  - Create, edit, delete discount rules
  - Set discount type (percentage/flat)
  - Attach discounts to specific courses/projects
  - Promo code setup (custom code, min purchase, usage limits)
  - Target audience selection (all, new, specific users)
  - Set start/end date, max discount cap, status (active/inactive)
  - Preview/test discount behavior
  - Apply discounts on: course, first-time purchase, referral

### 4. **Student Panel Features**
- During checkout:
  - Auto-apply eligible discounts
  - Allow manual promo code entry
  - Show original price, discount, and final price
  - Display success/error messages for promo codes
  - Optionally show limited time offer countdown

### 5. **Discount Logic Examples**
  - Promo code discount if valid
  - Welcome discount for new users
  - only available discount code between some dates.
  - only applicable for specific user segments.
  - limited to one-time use per user.
  - cannot be combined with other discounts.
  - must be applied before checkout.
  - applicable only for specific courses/projects.
  - only available for payment above certain amount.

---

**Goal:**  
A flexible, robust discount system for all course/project types, with full admin management and seamless student checkout experience.




### Questions & Requests

- Why are there two separate "course create order" functionalities?
- Please remove the course-specific create order routes and functions.
- How does a user apply a discount code to their current cart?
- Is the discount code functionality currently working?
- The create order feature should support both projects and courses (live & recorded).
- In the projects get/course get, do not show the files if the user has not purchased the course/project.
- Do not allow the user to download the files if they have not purchased the course/project.
- Ensure the user can only access/download/view the course/project if they have purchased it.
- Please ensure the course and project models are updated to reflect the new discount system.
- Ensure the course and project models have fields for discounts, promo codes, and other necessary attributes.
- Only the course/project purchased users can review & rate the course/project.
- use the courseRating, projectRating, instructorRating models to store the ratings and reviews.
- and create the necessary APIs to handle the ratings and reviews.



