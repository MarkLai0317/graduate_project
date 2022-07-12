var series = require('fastseries')({
  // if you want the results, then here you are
  results: true
})

series(
  {}, // what will be this in the functions
  [something, something, something], // functions to call
  42, // the first argument of the functions
  done // the function to be called when the series ends
)

function late (arg, cb) {
  console.log('finishing', arg)
  cb(null, 'myresult-' + arg)
}

function something (arg, cb) {
  setTimeout(late, 1000, arg, cb)
}

function done (err, results) {
  console.log('series completed, results:', results)
}