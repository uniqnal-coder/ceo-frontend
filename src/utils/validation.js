// Form validation utilities

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone) => {
  // Iraqi phone format: +964 7XX XXX XXXX or 07XX XXX XXXX
  const phoneRegex = /^(\+964|0)?7[0-9]{9}$/
  return phone.replace(/\s/g, '').match(phoneRegex)
}

export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined && value !== ''
}

export const validateNumber = (value, min = 0, max = Infinity) => {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

export const validateAge = (age) => {
  return validateNumber(age, 1, 150)
}

export const validateSalary = (salary) => {
  return validateNumber(salary, 0, 100000000)
}

export const validateAmount = (amount) => {
  return validateNumber(amount, 0, 1000000000)
}

export const validateDate = (dateString) => {
  if (!dateString) return true // Optional dates
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date)
}

export const validateName = (name) => {
  return validateRequired(name) && name.trim().length >= 2 && name.trim().length <= 100
}

export const validateDepartment = (department) => {
  return validateRequired(department) && department.trim().length >= 2
}

// Validation error messages
export const getValidationError = (field, value) => {
  switch (field) {
    case 'name':
      if (!validateRequired(value)) return 'Name is required'
      if (value.trim().length < 2) return 'Name must be at least 2 characters'
      if (value.trim().length > 100) return 'Name must not exceed 100 characters'
      return null
    
    case 'email':
      if (!validateRequired(value)) return 'Email is required'
      if (!validateEmail(value)) return 'Invalid email format'
      return null
    
    case 'phone':
      if (value && !validatePhone(value)) return 'Invalid phone number (use Iraqi format: 07XX XXX XXXX)'
      return null
    
    case 'age':
      if (value && !validateAge(value)) return 'Age must be between 1 and 150'
      return null
    
    case 'salary':
      if (value && !validateSalary(value)) return 'Invalid salary amount'
      return null
    
    case 'amount':
      if (!validateRequired(value)) return 'Amount is required'
      if (!validateAmount(value)) return 'Invalid amount'
      return null
    
    case 'department':
      if (!validateRequired(value)) return 'Department is required'
      if (value.trim().length < 2) return 'Department must be at least 2 characters'
      return null
    
    default:
      return null
  }
}

// Validate entire form
export const validateForm = (formData, requiredFields) => {
  const errors = {}
  
  requiredFields.forEach(field => {
    const error = getValidationError(field, formData[field])
    if (error) {
      errors[field] = error
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
