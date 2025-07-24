export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(uuid));
}

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
  // For development/testing purposes, return a fixed OTP
  if (process.env.SERVER_TYPE === 'development') {
    return "123456";
  }
  return Math.floor(Math.random() * Math.pow(10, digits))
    .toString()
    .padStart(digits, "0");
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
      "Price must be specified and greater than zero for paid courses.",
    );
  }

  // Validate liveStartDate and liveEndDate for live and hybrid courses
  if (
    (courseData.type === "live" || courseData.type === "hybrid") &&
    (!courseData.liveStartDate || !courseData.liveEndDate)
  ) {
    errors.push(
      "Live and Hybrid courses must have both liveStartDate and liveEndDate.",
    );
  }

  return errors;
};

export const validateCourseLevelInput = (levelData) => {
  const errors = [];

  // Validate name field
  if (!levelData.name || levelData.name.trim() === "") {
    errors.push("Level name is required.");
  }

  // Validate order field (optional but ensure it's a number)
  if (levelData.order !== undefined && typeof levelData.order !== "number") {
    errors.push("Order must be a valid number.");
  }

  return errors;
};

export const validateSkillInput = (skillData) => {
  const errors = [];

  // Validate skillName field (required)
  if (!skillData.skillName || skillData.skillName.trim() === "") {
    errors.push("Skill name is required.");
  } else if (
    skillData.skillName.length < 2 ||
    skillData.skillName.length > 100
  ) {
    errors.push("Skill name must be between 2 and 100 characters.");
  }

  // Validate category field (optional but must be valid string if provided)
  if (skillData.category && typeof skillData.category !== "string") {
    errors.push("Category must be a valid string.");
  }

  // Validate level field (optional but must be valid string if provided)
  if (skillData.level && typeof skillData.level !== "string") {
    errors.push("Level must be a valid string.");
  }

  // Validate goalId if provided (optional)
  if (skillData.goalId) {
    if (typeof skillData.goalId !== "string") {
      errors.push("Goal ID must be a string.");
    } else if (!isValidUUID(skillData.goalId)) {
      errors.push("Goal ID must be a valid UUID format.");
    }
  }

  return errors;
};

export const validateLanguageInput = (languageData) => {
  const errors = [];

  // Validate language name (required)
  if (!languageData.language || languageData.language.trim() === "") {
    errors.push("Language name is required.");
  }

  // Validate language code (required)
  if (!languageData.languageCode || languageData.languageCode.trim() === "") {
    errors.push("Language code is required.");
  } else if (!/^[a-z]{2,5}(-[A-Z]{2,5})?$/i.test(languageData.languageCode)) {
    errors.push("Language code should be in format like en, en-US, fr etc.");
  }

  // Validate native name (optional but must be valid if provided)
  if (
    languageData.nativeName &&
    (languageData.nativeName.length < 1 || languageData.nativeName.length > 100)
  ) {
    errors.push("Native name must be between 1 and 100 characters.");
  }

  // Validate language type (optional)
  if (
    languageData.languageType &&
    !["user_preference", "course_language", "both"].includes(
      languageData.languageType,
    )
  ) {
    errors.push(
      "Language type must be one of: user_preference, course_language, both.",
    );
  }

  return errors;
};

export const validateGoalInput = (goalData) => {
  const errors = [];

  // Validate title/goalName field (required)
  const goalName = goalData.title || goalData.goalName;
  if (!goalName || goalName.trim() === "") {
    errors.push("Goal title is required.");
  } else if (goalName.length < 3 || goalName.length > 100) {
    errors.push("Goal title must be between 3 and 100 characters.");
  }

  // Validate level field (optional but must be valid string if provided)
  if (goalData.level && typeof goalData.level !== "string") {
    errors.push("Level must be a valid string.");
  }
  
  // Validate levelId if provided directly (optional)
  if (goalData.levelId) {
    if (typeof goalData.levelId !== "string") {
      errors.push("Level ID must be a string.");
    } else if (!isValidUUID(goalData.levelId)) {
      errors.push("Level ID must be a valid UUID format.");
    }
  }

  // Validate description (optional)
  if (goalData.description && typeof goalData.description !== "string") {
    errors.push("Description must be a valid string.");
  }

  return errors;
};
