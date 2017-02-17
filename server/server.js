/**
 * Basic example demonstrating passport-steam usage within Express framework
 * This example uses Express's router to separate the steam authentication routes
 */
var priv_info = require('../priv_info');
var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , session = require('express-session')
  , SteamStrategy = require('passport-steam').Strategy
  , authRoutes = require('./routes/auth')
  , userRoutes = require('./routes/user');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:3000/auth/steam/return',
    realm: 'http://localhost:3000/',
    apiKey: priv_info.steam_api_key
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

var app = express();

// configure Express
app.set('views', './views');
app.set('view engine', 'ejs');

var MySQLStore = require('express-mysql-session')(session);
var options = {
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: priv_info.db_pwd,
	database: 'cs_trade_session'
};

var sessionStore = new MySQLStore(options);
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    name: 'sessionId',
	key: 'session',
	secret: 'PerkeleHelvettiSaatana',
	store: sessionStore,
	resave: true,
	saveUninitialized: true
}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());


var path = require('path');
var config = require('../webpack.config.js');
var webpack = require('webpack');
var webpackDevMiddleware = require('webpack-dev-middleware');
var webpackHotMiddleware = require('webpack-hot-middleware');

var compiler = webpack(config);
app.use(webpackDevMiddleware(compiler, {noInfo: true, publicPath: config.output.publicPath}));
app.use(webpackHotMiddleware(compiler));

app.use(express.static('./dist'));


// See views/auth.js for authentication routes
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

var utils = require('../custom_utils.js');
app.use('/', function (req, res) {
	var obj = { state: { steam: {} }};
	
	var user_exists = req.isAuthenticated() && !utils.isEmpty(req.user);
	if(user_exists) {
		obj.state.user_id = req.user.id;
		obj.state.steam[req.user.id] = req.user; 
	}
	res.render('custom_index', obj);
});

var port = 3000;
app.listen(port, function(error) {
  if (error) throw error;
  console.log("Express server listening on port", port);
});
