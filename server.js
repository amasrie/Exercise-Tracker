require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MLAB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

let user = require('./models/user')(mongoose);
let exercise = require('./models/exercise')(mongoose);

let checkUser = (res, userId, cb) => {
  user.findById(userId).exec((err, match) => {
    if(err || !match){
      res.send({status: 412, message: "An error occured while trying to get the user."});
    }else{
      cb(match);
    }
  });
}

app.post('/api/exercise/new-user', (req, res) => {
  let username = req.body.username;
  if(!username){
    throw {message: "Path `username` is required.", status: 412};
  }else{
    user.find({name: username}, (err, matches) => {
      if(err){
        throw err;
      }else if(matches.length > 0){
        throw {message: "The selected username was already selected.", status: 409};
      }else{
        let newUser = new user({
          name: username
        });
        newUser.save(err => {
          if(err){
            throw err;
          }else{
            res.send(newUser);
          }
        });
      }
    })
  }
});

app.get('/api/exercise/users', (req, res) => {
  user.find()
    .select({_id: 1, name: 1})
    .exec((err, users) => {
      if(err){
        throw err;
      }else{
        res.send(users);
      }
    })
});

app.post('/api/exercise/add', (req, res) => {
  let description = req.body.description;
  let userId = req.body.userId;
  let duration = req.body.duration;
  let date = req.body.date;
  let json = {
    userId: userId,
    description: description,
    duration: duration
  };
  if(date){
    json.date = date;
  }
  if(!userId || !duration || !description){
    throw {status: 412, message: "Missing required parameters."}
  }else if(isNaN(duration) || Number(duration) < 1){
    throw {status: 412, message: "Duration must be a number representing the amount of minutes and should be positive."}
  }else if(date && isNaN(Date.parse(date))){
    throw {status: 412, message: "A valid date should be added in YYYY-MM-DD format."}
  }else if(!mongoose.Types.ObjectId.isValid(userId)){
    throw {status: 412, message: "The provided id does not have the valid format."}
  }else{
    checkUser(res, userId, match => {
      let newExercise = new exercise(json);
      newExercise.save(err => {
        if(err){
          throw err;
        }else{
          res.send(newExercise);
        }
      });
    });
  }
});

app.get('/api/exercise/log', (req, res) => {
  let sent = false;
  let userId = req.query.userId;
  let to =  req.query.to;
  let from = req.query.from;
  let limit = req.query.limit;
  let comparison = {
    userId: null
  };
  if(to && isNaN(Date.parse(to))){
    throw {status: 412, message: "A valid date should be added in YYYY-MM-DD format for the to parameter."}
    sent = true;
  }else if(to){
    comparison["date"] = {};
    comparison["date"]["$lte"] = to;
  }
  if(from && isNaN(Date.parse(from))){
    throw {status: 412, message: "A valid date should be added in YYYY-MM-DD formatfor the from parameter."}
    sent = true;
  }else if(from){
    comparison["date"] = !comparison["date"] ? {} : comparison["date"];
    comparison["date"]["$gte"] = from;
  }
  if(!mongoose.Types.ObjectId.isValid(userId)){
    throw {status: 412, message: "The provided id does not have the valid format."}
    sent = true;
  }else if(!sent){
    checkUser(res, userId, match => {
      comparison["userId"] = userId;
      let foundExercises = exercise.find(comparison);
      if(limit && (isNaN(limit) || Number(limit) < 1)){
        throw {status:412, message: "The limit should be a positive number."}
        sent = true;
      }else if(limit){
        foundExercises = foundExercises.limit(Number(limit));
      }
      foundExercises.exec((err, list) => {
        if(err){
          throw err;
        }else{
          let json = {
            user: match,
            count: list.length,
            exercises: list
          };
          if(!sent){
            res.send(json);            
          }
        }
      });
    })
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})