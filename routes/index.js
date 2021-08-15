var express = require('express');
var router = express.Router();
var Cart = require('../models/cart');



var Product = require('../models/product');
var Order = require('../models/order');




/* GET home page. */
router.get('/', function (req, res, next) {
  var successMsg = req.flash('success')[0];
  Product.find(function (err, docs) {
      var productChunks = [];
      var chunkSize = 3;
      for (var i = 0; i < docs.length; i += chunkSize) {
          productChunks.push(docs.slice(i, i + chunkSize));
      }
      res.render('shop/index', {title: '207371901_CHOI_TIK_FUNG', products: productChunks, successMsg: successMsg, noMessages: !successMsg});
  });
});


/* Get editProduct view (Planned - admin login) */
router.get('/editProduct', isLoggedIn, function (req, res, next) {
  var successMsg = req.flash('success')[0];
  Product.find(function (err, docs) {
      var productChunks = [];
      var chunkSize = 3;
      for (var i = 0; i < docs.length; i += chunkSize) {
          productChunks.push(docs.slice(i, i + chunkSize));
      }
  
  res.render('shop/index_admin', {title: '207371901_CHOI_TIK_FUNG-Admin', products: productChunks, successMsg: successMsg, noMessages: !successMsg});
  });
});

/*ADD product to db  */

router.post('/AddProduct', function(req, res, next) {
  
  var products =  new Product({
    imagePath : req.body.imagePath,
    title : req.body.title, 
    description : req.body.description,
    price : req.body.price
  });

    products.save();
    res.redirect('/editProduct');
  
});

/* Update product on db (broken) */
router.post('/UpdateProduct', (req, res) => {
  
  if (req.body._id == '')
      insertRecord(req, res);
      else
      updateRecord(req, res);


      function insertRecord(req, res) {
        var products = new Product();
        products.imagePath = req.body.imagePath;
        products.title = req.body.title;
        products.description = req.body.description;
        products.price = req.body.price;
        products.save((err, doc) => {
          
          handleValidationError(err, req.body);
          res.render("shop/index_admin", {
              products: req.body
          });
          console.log('Error during record insertion : ' + err);
      });
      }
      
      function updateRecord(req, res) {
        Product.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true }, (err, doc) => {
          res.render("shop/index_admin", {
            products: req.body
          });
        });
       
      };

});





router.get('/UpdateProduct/:id', (req, res) => {
  Product.findById(req.params.id, (err, doc) => {
      if (!err) {
          res.render("shop/index_admin", {
              prodocts: doc
          });
      }
      console.log('Error during record update : ' + err);
  });
});


/*DELETE product from db  */
router.get('/DeleteProduct/:id', (req, res) => {
  Product.findByIdAndRemove(req.params.id, (err, doc) => {
      if (!err) {
          res.redirect('/editProduct');
      }
      else { console.log('Error in product delete :' + err); }
  });
});


/* Get cart object edit */
router.get('/add-to-cart/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  Product.findById(productId, function(err, product) {
     if (err) {
         return res.redirect('/');
     }
      cart.add(product, product.id);
      req.session.cart = cart;
      console.log(req.session.cart);
      res.redirect('/');
  });
});

router.get('/reduce/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.reduceByOne(productId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

router.get('/remove/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.removeItem(productId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

/* Get cart view */
router.get('/shopping-cart', function(req, res, next) {
  if (!req.session.cart) {
      return res.render('shop/shopping-cart', {products: null});
  } 
   var cart = new Cart(req.session.cart);
   res.render('shop/shopping-cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});

/* Get checkout view */
router.get('/checkout', isLoggedIn, function(req, res, next) {
  if (!req.session.cart) {
      return res.redirect('/shopping-cart');
  }
  var cart = new Cart(req.session.cart);
  var errMsg = req.flash('error')[0];
  res.render('shop/checkout', {total: cart.totalPrice, errMsg: errMsg, noError: !errMsg});
});

/* stripe charge */
router.post('/checkout', isLoggedIn, function(req, res, next) {
  if (!req.session.cart) {
      return res.redirect('/shopping-cart');
  }
  var cart = new Cart(req.session.cart);
  
  var stripe = require("stripe")(
      "sk_test_51JMbEoCmdJb26RqYYPp9bLZZjxtU47WU6ZsKSsG5JuSUPeV6rDWeKZqIcOg9WjNgHsY0Zl7pXWqGpiU2kHu7aux3009uxMhfhN"
  );

  stripe.charges.create({
      amount: cart.totalPrice * 100, //in cents > *100 to dollars
      currency: "hkd",
      source: "tok_visa", // visa token from https://stripe.com/docs/testing
      description: "Test Charge"
  }, function(err, charge) {
      if (err) {
          req.flash('error', err.message);
          return res.redirect('/checkout');
      }
      var order = new Order({  // start save order record to db
          user: req.user,
          cart: cart,
          address: req.body.address,
          name: req.body.name,
          paymentId: charge.id
      });
      order.save(function(err, result) {
          req.flash('success', 'Successfully bought product! Please check your order');
          req.session.cart = null;
          res.redirect('/');
      });
  }); 
});


module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  req.session.oldUrl = req.url;
  res.redirect('/user/signin');
};

//supose to add role to users account, but here is just demo the concept
// now it got all users can edit the products db
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && (req.user.id === "610fd79aced4262088352ffd")) {
      return next();
  }
  req.session.oldUrl = req.url;
  req.flash('error_msg', 'You have tried to access a restricted space. As a result you have been logged out!');
  res.redirect('/user/signin');
}