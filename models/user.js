module.exports = function(db){
	let userSchema = db.Schema({
  		name: {
	    	type: String,
	    	required: true
		}
	});
	return db.model('User_ET', userSchema);
};