export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validateMobile(mobile) {
  const re = /^[6-9]\d{9}$/;
  return re.test(String(mobile));
}

export const isValidSkill = (skill) => {
  return typeof skill === "string" && skill.trim().length > 0;
};

export const generateOtp = (digits = 6) => {
  return Math.floor(Math.random() * Math.pow(10, digits)).toString().padStart(digits, '0');
};

export const validateCourseInput = (courseData) => {
  const errors = [];

  // Validate title
  if (!courseData.title || courseData.title.trim() === "") {
    errors.push("Title is required.");
  }

  // Validate description
  if (!courseData.description || courseData.description.trim() === "") {
    errors.push("Description is required.");
  }

  // Validate levelId
  if (!courseData.levelId) {
    errors.push("Level ID is required.");
  }

  // Validate categoryId
  if (!courseData.categoryId) {
    errors.push("Category ID is required.");
  }

  // Validate languageId
  if (!courseData.languageIds) {
    errors.push("Language IDs is required.");
  }


  // Validate type (must be 'live', 'recorded', or 'hybrid')
  if (
    !courseData.type ||
    !["live", "recorded", "hybrid"].includes(courseData.type)
  ) {
    errors.push("Course type must be 'live', 'recorded', or 'hybrid'.");
  }

  // Validate price for paid courses
  if (
    courseData.isPaid &&
    (courseData.price === undefined || courseData.price <= 0)
  ) {
    errors.push(
      "Price must be specified and greater than zero for paid courses."
    );
  }

  // Validate liveStartDate and liveEndDate for live and hybrid courses
  if (
    (courseData.type === "live" || courseData.type === "hybrid") &&
    (!courseData.liveStartDate || !courseData.liveEndDate)
  ) {
    errors.push(
      "Live and Hybrid courses must have both liveStartDate and liveEndDate."
    );
  }

  return errors;
};

export const validateCourseLevelInput = (levelData) => {
  const errors = [];

  // Validate level field
  if (!levelData.level || levelData.level.trim() === "") {
    errors.push("Level is required.");
  }

  // Validate order field (optional but ensure it's a number)
  if (levelData.order !== undefined && typeof levelData.order !== "number") {
    errors.push("Order must be a valid number.");
  }

  return errors;
};
