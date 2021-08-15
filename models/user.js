var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var userSchema = new Schema({
    email: {type: String, required: true},
    password: {type: String, required: true}
});

userSchema.methods.encryptPassword = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);  
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);  
};

userSchema.pre('save', function(next){
  var user = this;

  //check if password is modified, else no need to do anything
  if (!user.isModified('pass')) {
     return next()
  }

  user.pass = bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
  next()
})



module.exports = mongoose.model('User', userSchema);