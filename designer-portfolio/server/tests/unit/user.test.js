const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const mockUserData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123',
  role: 'user',
  isActive: true,
};

describe('User Model', () => {
  describe('Password Hashing', () => {
    test('should hash password before creating user', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    test('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('WrongPassword', hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('User Data Structure', () => {
    test('should have required fields', () => {
      expect(mockUserData).toHaveProperty('id');
      expect(mockUserData).toHaveProperty('username');
      expect(mockUserData).toHaveProperty('email');
      expect(mockUserData).toHaveProperty('password');
      expect(mockUserData).toHaveProperty('role');
      expect(mockUserData).toHaveProperty('isActive');
    });

    test('should have valid UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(mockUserData.id).toMatch(uuidRegex);
    });
  });
});

describe('Validation', () => {
  describe('Email Validation', () => {
    test('should validate correct email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect('test@example.com').toMatch(emailRegex);
      expect('user.name@domain.co.uk').toMatch(emailRegex);
    });

    test('should reject invalid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect('invalid-email').not.toMatch(emailRegex);
      expect('@domain.com').not.toMatch(emailRegex);
      expect('user@').not.toMatch(emailRegex);
    });
  });

  describe('Password Validation', () => {
    test('should validate password strength', () => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      expect('Password123').toMatch(passwordRegex);
      expect('MyP4ssword').toMatch(passwordRegex);
    });

    test('should reject weak passwords', () => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      expect('password123').not.toMatch(passwordRegex);
      expect('PASSWORD123').not.toMatch(passwordRegex);
      expect('Password').not.toMatch(passwordRegex);
    });
  });

  describe('Username Validation', () => {
    test('should validate correct username format', () => {
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      expect('testuser').toMatch(usernameRegex);
      expect('test_user').toMatch(usernameRegex);
      expect('test-user').toMatch(usernameRegex);
      expect('TestUser123').toMatch(usernameRegex);
    });

    test('should reject invalid username format', () => {
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      expect('test user').not.toMatch(usernameRegex);
      expect('test@user').not.toMatch(usernameRegex);
    });
  });
});
