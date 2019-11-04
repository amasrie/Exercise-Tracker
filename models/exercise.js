module.exports = function(db){
	let exerciseSchema = db.Schema({
		userId: {
	    	type: db.Schema.Types.ObjectId,
	    	required: true
		},
		description: {
			type: String,
			required: true
		},
		duration: {
			type: Number,
			required: true
		},
		date: {
			type: Date,
			default: Date.now
		}
	});
	return db.model('Exercise_ET', exerciseSchema);
};