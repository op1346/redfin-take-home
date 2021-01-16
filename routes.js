'use strict'

const express = require('express');
const {check, validationResult} = require('express-validator');
const bcryptjs = require('bcryptjs');
const { models } = require('./db');
const basicAuth = require('basic-auth');

// Construct a router instance.
const router = express.Router();

const { User } = models;

// Async Handler
function asyncHandler(cb){
  return async(req, res, next) => {
    try {
      await cb(req, res, next)
    } catch(error){
      return next(error)
    }
  }
}

// Users
// Authenticate User
const authenticateUser = asyncHandler(async(req, res, next) => {
  let message = null;
  const credentials = basicAuth(req);
  // If credentials found - username
  if (credentials) {
    const user = await User.findOne({
      where: {userName: credentials.name}
    });
    // If user is found - password
    if (user) {
      const authenticated = bcryptjs
        .compareSync(credentials.pass, user.password);
      // If password matches
      if (authenticated) {
        req.currentUser = user;
      } else {
        message = `Authentication failure for email: ${user.userName}`;
      }
    } else {
      message = "User not found";
    }
  } else {
    message = 'Auth header not found';
  }
  // If user authentication fails -> access denied
  if (message) {
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
});

// GET /api/users 200 - returns currently authenticated user
router.get('/users', authenticateUser, asyncHandler(async(req, res) => {
  const user = req.currentUser;
  res.json({
    Id: user.id,
    Name: `${user.firstName} ${user.lastName}`,
    Username: user.userName
  });
  res.status(200).end();
}));

// POST /api/users 201 - creates a user, sets location header to '/' and returns no content
router.post('/users', [
  check('userName')
    .exists()
    .withMessage('Please provide a value for "userName"'),
  check('firstName')
    .exists()
    .withMessage('Please provide a value for "firstName"'),
  check('lastName')
    .exists()
    .withMessage('Please provide a value for "lastName"'),
  check('password')
    .exists()
    .withMessage('Please provide a value for "password"'),
  check('momFavorite')
    .exists()
    .withMessage(`Please provide a value for "Mother's Favorite Search Engine"`)
], asyncHandler(async( req, res ) => {
      const errors = validationResult(req);
      const user = req.body;
      // If there are validation errors
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        return res.status(400).json({ errors: errorMessages });
      }
      const userExists = await User.findOne({
        where: {userName: req.body.userName,}
      });
      // If the user exists
      if(userExists) {
        res.status(400).json({ message: "This username is already in use"})
      }
      // Encrypt password
      if(user.password) {
        user.password = bcryptjs.hashSync(user.password);
      }
    try {
      // Create user
      await User.create(user);
      res.status(201).location('/').end();
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      res.status(400).location('/').json({error: error.errors[0].message});
    } else {
      throw error;
    }
  }
}));

// logout
router.post('/logout', function(req, res) {
  logout.logoutUser(req, res, function(error, data) {
    if (error) {
      res.json({ 'error': data.error, 'message': data.message });
    } else {
      res.json({ 'success': data.success, 'message': data.message });
    }
  });
});


module.exports = router;