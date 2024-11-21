const path = require('path');
const express = require('express');
const session = require('express-session');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const index = require('./routes/index');
const { connectNode1, connectNode2, connectNode3 } = require('./sql_conn.js');
const app = express();
const port = 3000;

// Session Management
app.use(session({
  secret: 'STADVDB', // Replace with a random string for production
  resave: false,
  saveUninitialized: false
}));

// Set the directory for static assets (e.g., CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
// Set the directory for views (containing hbs templates)
app.set('views', path.join(__dirname, 'views'));

// Configure Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: {}
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', index);

connectNode1().then(() => {
  console.log('Node1 is connected!');
}).catch((err) => {
  console.error('Error connecting to Node1:', err);
});

connectNode2().then(() => {
  console.log('Node2 is connected!');
}).catch((err) => {
  console.error('Error connecting to Node1:', err);
});

connectNode3().then(() => {
  console.log('Node3 is connected!');
}).catch((err) => {
  console.error('Error connecting to Node1:', err);
});


app.listen(port,()=>{
  console.log(`Listening on Port ${port}`)
})

