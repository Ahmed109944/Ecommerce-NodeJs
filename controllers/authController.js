const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECURE, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  if (!req.body.password || !req.body.email) {
    return next(new AppError('Please provide us by email and password', 400));
  }
  const user = await User.findOne({ email: req.body.email }).select(
    '+password',
  );

  if (
    !user ||
    !(await user.correctPassword(req.body.password, user.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in please log in to get access', 401),
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECURE);

  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(
      new AppError(
        'The user belonging to this token does not no longer exist',
        404,
      ),
    );
  }
  if (freshUser.checkPasswordChanged(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again.', 401),
    );
  }
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You don't have the permission to access this service ",
          403,
        ),
      );
    }
    next();
  };

exports.forgetPassword = catchAsync(async (req, res, next) => {
  //get user ,check if exist
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }
  const randomNum = user.CreatePasswordResetCode();
  await user.save({ validateBeforeSave: false });
  console.log(user);

  await sendEmail({
    to: user.email,
    subject: 'Your password reset code (valid for 10 minutes',
    message: `
Hi ${user.name}, \n
Enter this code to complete the reset. \n
${randomNum} \n
Thanks for helping us keep your account secure. \n
The e-commerce Team \n
`,
  });
  res.status(200).json({
    status: 'success',
    message: 'Reset code passed to your mail, Please check your inbox mails',
  });
});

exports.verifyResetCode = catchAsync(async (req, res, next) => {
  hashedResetCode = crypto
    .createHash('sha256')
    .update(req.body.passwordRestCode)
    .digest('hex');
  console.log(hashedResetCode);
  const user = await User.findOne({
    passwordRestCode: hashedResetCode,
    passwordRestExpires: { $gt: Date.now() },
  });
  console.log(user);
  if (!user) {
    return next(
      new AppError(
        'Invalid password Reset Code, check code from mail again!',
        404,
      ),
    );
  }
  user.passwordRestIsused = true;
  user.passwordRestCode = undefined;
  user.passwordRestExpires = undefined;
  user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }

  if (!user.passwordRestIsused) {
    return next(
      new AppError(
        'Invalid password Reset Code, check code from mail again!',
        404,
      ),
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordRestIsused = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();
  res.status(200).json({
    status: 'success',
    data: 'Password Updated !!',
  });
});
