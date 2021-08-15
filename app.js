var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var Handlebars = require('handlebars')
var expressHbs = require('express-handlebars');
// please add : var {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
var {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');
//required: $ npm install express-validator@5.3.1 --save 
var validator = require('express-validator');
//required: $ npm install --save connect-mongo
var MongoStore = require('connect-mongo');

var weatherData = require('./models/weatherData');

var indexRouter = require('./routes/index');
var userRoutes = require('./routes/user');

var app = express();

mongoose.connect('mongodb://localhost:27017/shopping');
require('./config/passport');

// view engine setup
app.engine('.hbs', expressHbs({defaultLayout: 'layout', extname: '.hbs', handlebars: allowInsecurePrototypeAccess(Handlebars)}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({
  secret: 'secretSess', 
  resave: false, 
  saveUninitialized: false,
}));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use(session({
  secret: 'secretSess', 
  resave: false, 
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/shopping' }), //use MongoStore.Create({ mongoUrl: 'DB location' }) after MDB ver.4
  cookie: { maxAge: 180 * 60 * 1000 } //session expire : 180min 60s 1000ms
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  next();
});



app.use('/user', userRoutes);
app.use('/', indexRouter);


app.get('', (req, res) => {
  res.render('/', {
      title: 'Weather App'
  })
})

//open weather api
app.get('/weather', (req, res) => {
  const address = req.query.address
  if(!address) {
      return res.send({
          error: "You must enter address in search text box"
      })
  }

  weatherData(address, (error, {temperature, description, cityName} = {}) => {
      if(error) {
          return res.send({
              error
          })
      }
      console.log(temperature, description, cityName);
      res.send({
          temperature,
          description,
          cityName
      })
  })
});




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
