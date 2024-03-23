const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const shortid = require('shortid')

require('dotenv').config()

mongoose.set('strictQuery', false)

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

mongoose.connect(
  'mongodb+srv://DemoFKD:demodemo@url-shortener.y4ipwmb.mongodb.net/?retryWrites=true&w=majority&appName=url-shortener',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)

const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
})

const userSchema = new mongoose.Schema({
  username: String,
})

let User = mongoose.model('User', userSchema)

let Exercise = mongoose.model('Exercise', exerciseSchema)

/**
 * Deletes all users from the database.
 *
 * @param {Request} _req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.get('/api/users/delete', function (_req, res) {
  console.log('### delete all users ###'.toLocaleUpperCase())

  User.deleteMany({}, function (err, result) {
    if (err) {
      console.error(err)
      res.json({
        message: 'Deleting all users failed!',
      })
    }

    res.json({ message: 'All users have been deleted!', result: result })
  })
})

/**
 * Deletes all exercises from the database.
 *
 * @param {Request} _req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.get('/api/exercises/delete', function (_req, res) {
  Exercise.deleteMany({}, function (err, result) {
    if (err) {
      console.error(err)
      res.json({
        message: 'Deleting all exercises failed!',
      })
    }

    res.json({ message: 'All exercises have been deleted!', result: result })
  })
})

/**
 * Serves the index.html file from the public directory.
 *
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.get('/', async (_req, res) => {
  res.sendFile(__dirname + '/views/index.html')
  await User.syncIndexes()
  await Exercise.syncIndexes()
})

app.get('/api/users', function (_req, res) {
  User.find({}, function (err, users) {
    if (err) {
      console.error(err)
      res.json({
        message: 'Getting all users failed!',
      })
    }

    if (users.length === 0) {
      res.json({ message: 'There are no users in the database!' })
    }

    res.json(users)
  })
})

/**
 * Creates a new user in the database.
 *
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.post('/api/users', function (req, res) {
  const inputUsername = req.body.username

  let newUser = new User({ username: inputUsername })

  newUser.save((err, user) => {
    if (err) {
      console.error(err)
      res.json({ message: 'User creation failed!' })
    }

    res.json({ username: user.username, _id: user._id })
  })
})

/**
 * Creates a new exercise log for a specific user.
 *
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.post('/api/users/:_id/exercises', function (req, res) {
  let userId = req.params._id
  let description = req.body.description
  let duration = req.body.duration
  let date = req.body.date

  if (!date) {
    date = new Date().toISOString().substring(0, 10)
  }

  User.findById(userId, (err, userInDb) => {
    if (err) {
      console.error(err)
      res.json({ message: 'There are no users with that ID in the database!' })
    }

    let newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description: description,
      duration: parseInt(duration),
      date: date,
    })

    newExercise.save((err, exercise) => {
      if (err) {
        console.error(err)
        res.json({ message: 'Exercise creation failed!' })
      }

      res.json({
        username: userInDb.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
        _id: userInDb._id,
      })
    })
  })
})

/**
 * Returns a user's exercise log within a specific date range.
 *
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 */
app.get('/api/users/:_id/logs', async function (req, res) {
  const userId = req.params._id
  const from = req.query.from || new Date(0).toISOString().substring(0, 10)
  const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10)
  const limit = Number(req.query.limit) || 0

  let user = await User.findById(userId).exec()

  let exercises = await Exercise.find({
    userId: userId,
    date: { $gte: from, $lte: to },
  })
    .select('description duration date')
    .limit(limit)
    .exec()

  let parsedDatesLog = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }
  })

  res.json({
    _id: user._id,
    username: user.username,
    count: parsedDatesLog.length,
    log: parsedDatesLog,
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
