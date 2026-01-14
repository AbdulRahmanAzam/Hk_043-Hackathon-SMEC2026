// Email validation for university domains
export const isUniversityEmail = (email: string): boolean => {
  const universityPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.[a-z]{2})$/i;
  return universityPattern.test(email);
};

// Password validation
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// UUID validation
export const isValidUUID = (uuid: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
};

// Task validation
export const validateTask = (data: any) => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 10) {
    errors.push('Title must be at least 10 characters');
  }

  if (!data.description || data.description.trim().length < 20) {
    errors.push('Description must be at least 20 characters');
  }

  if (!data.budget || data.budget <= 0) {
    errors.push('Budget must be greater than 0');
  }

  if (!data.deadline) {
    errors.push('Deadline is required');
  } else {
    const deadlineDate = new Date(data.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today) {
      errors.push('Deadline must be in the future');
    }
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }

  return errors;
};

// Bid validation
export const validateBid = (data: any) => {
  const errors: string[] = [];

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.timeEstimate || data.timeEstimate.trim().length === 0) {
    errors.push('Time estimate is required');
  }

  if (!data.message || data.message.trim().length < 20) {
    errors.push('Message must be at least 20 characters');
  }

  return errors;
};

// Review validation
export const validateReview = (data: any) => {
  const errors: string[] = [];

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }

  if (!data.comment || data.comment.trim().length < 10) {
    errors.push('Comment must be at least 10 characters');
  }

  return errors;
};

// Sanitize string input
export const sanitize = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};
