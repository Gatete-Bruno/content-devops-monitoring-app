// Require and call Express
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var responseTime = require('response-time');

const prom = require('prom-client');
const collectDefaultMetrics = prom.collectDefaultMetrics;

//Metric Definitions


const responsetimesumm = new prom.Summary ({
  name: 'forethought_response_time_summary',
  help: 'Latency in percentiles',
});


const taskgauge = new prom.Gauge({
  name: 'forethought_current_tasks',
  help: 'Amount of incomplete tasks'
});


const tasksdone = new prom.Counter({
  name: 'forethought_tasks_complete',
  help: 'The number of items completed'
});

const tasksadded = new prom.Counter({
  name: 'forethought_tasks_added',
  help: 'The number of items added to the to-do list, total'
});

const responsetimehist = new prom.Histogram ({
  name: 'forethought_response_time_histogram',
  help: 'Latency in history form',
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});


collectDefaultMetrics({ prefix: 'forethought_' });

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// use css
app.use(express.static("public"));

// placeholder tasks
var task = [];
var complete = [];

// add a task
app.post("/addtask", function(req, res) {
  var newTask = req.body.newtask;
  task.push(newTask);
  res.redirect("/");
  tasksadded.inc();
  taskgauge.inc();
});

// remove a task
app.post("/removetask", function(req, res) {
  var completeTask = req.body.check;
  if (typeof completeTask === "string") {
    complete.push(completeTask);
    task.splice(task.indexOf(completeTask), 1);
  }
  else if (typeof completeTask === "object") {
    for (var i = 0; i < completeTask.length; i++) {
      complete.push(completeTask[i]);
      task.splice(task.indexOf(completeTask[i]), 1);
      tasksdone.inc();
      taskgauge.dec();
    }
  }
  res.redirect("/");
});

// tracking response time

app.use(responseTime(function (req, res, time) {
  responsetimesumm.observe(time);
  responsetimehist.observe(time);
}));

// get website files
app.get("/", function (req, res) {
  res.render("index", { task: task, complete: complete });
});
app.get('/metrics', function (req, res) {
  res.set('Content-Type', prom.register.contentType);
  res.end(prom.register.metrics());
});


// listen for connections
app.listen(8080, function() {
  console.log('Testing app listening on port 8080')
});
