var con = require("./connection");
var exp = require("express");
const session = require('express-session');
var fileupload = require('express-fileupload');
var app = exp();
const path = require("path");
const PORT = process.env.PORT || 7001

var bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileupload());

app.set("view engine", "ejs");
app.use(exp.static(path.join(__dirname, "public")));

app.use(session({
  secret: 'qwerty1234!@#$', 
  resave: true,
  saveUninitialized: true,
}));

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
};

app.use(['/new', '/status', '/delete-books', '/update-books', '/search-books', '/search'], isAuthenticated);

app.get('/login', (req, res) => {
  res.render(__dirname + '/login');
});

app.post('/login', async (request, response, next) => {

  var user_email_address = request.body.user_email_address;

  var user_password = request.body.user_password;

  if(user_email_address && user_password)
  {
      query = `
      SELECT * FROM user_login 
      WHERE user_email = "${user_email_address}"
      `;

      con.query(query, (error, data) => {

          if(data.length > 0)
          {
              for(var count = 0; count < data.length; count++)
              {
                  if(data[count].user_password == user_password)
                  {
                    request.session.user = {
                      user_id: data[count].user_id,
                      user_email: data[count].user_email
                    };

                      response.redirect("/");

                      return;
                  }
  
                }
                response.send('Incorrect Password');
          }
          else
          {
              response.send('Incorrect Email Address');
          }
          response.end();
      });
  }
  else
  {
      response.send('Please Enter Email Address and Password Details');
  }

});

app.get('/logout', function(request, response, next){

  request.session.destroy();

  response.redirect("/");

});

app.get('/register', (req, res) => {
  res.render(__dirname + '/register', { errorMessage: null });
});

app.post('/register', (req, res) => {
  const email = req.body.user_email_address;
  const password = req.body.user_password;

  if (!email || !password) {
    return res.render(__dirname + '/register', { errorMessage: 'Please fill out all fields.' });
  }

  // Check if the email is already registered
  con.query('SELECT * FROM user_login WHERE user_email = ?', [email], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length > 0) {
      return res.render(__dirname + '/register', { errorMessage: 'Email is already registered.' });
    }

    // Insert the new user into the database
    con.query('INSERT INTO user_login (user_email, user_password) VALUES (?, ?)', [email, password], (error) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
      }

      // Redirect to a success page or login page
      res.redirect('/login');
    });
  });
});

con.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

app.get("/new", (req, res) => {
  res.sendFile(__dirname + "/create.html");
});
app.get("/connect", (req, res) => {
  res.sendFile(__dirname + "/friend.html");
});

// app.post("/new", (req, res) => {
//   // var thumbnail = req.body.Thumbnail;
//   let thumbnail = req.files.thumbnail; // Assuming "thumbnail" is the name attribute of the file input field
//   let uploadPath = __dirname + '/uploads/' + thumbnail.name; // Define upload path
//   thumbnail.mv(uploadPath, (err) => {
//     if (err) {
//       return res.status(500).send(err);
//     }
//   var title = req.body.EventTitle;
//   var location = req.body.Location;
//   var time = req.body.Time;
//   var website = req.body.Website;

//   con.connect((err) => {

//     var sql =
//       "INSERT INTO home (Thumbnail, EventTitle, Location, Time, Website) VALUES ?";

//     var values = [[uploadPath, title, location, time, website]];
//     con.query(sql, [values], (err) => {
//       if (err) throw err;
//       res.redirect("/events-orgs");
//     });
//   });
// });
// });

app.post("/new", (req, res) => {
  if (!req.files || !req.files.thumbnail) {
    return res.status(400).send("No files were uploaded.");
  }

  let thumbnail = req.files.thumbnail;
  let uploadPath = __dirname + '/public/' + thumbnail.name;

  thumbnail.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    var title = req.body.EventTitle;
    var location = req.body.Location;
    var time = req.body.Time;
    var website = req.body.Website;

    var sql = "INSERT INTO home (Thumbnail, EventTitle, Location, Time, Website) VALUES ?";

    var values = [[thumbnail.name, title, location, time, website]];
    con.query(sql, [values], (err) => {
      if (err) throw err;
      res.redirect("/events-orgs");
    });
  });
});


app.get("/", isAuthenticated,(req, res) => {
  var sql = "SELECT * FROM home";
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.render(__dirname + '/homepage', { books: result });
  });
});

app.get("/events-user", (req, res) => {
  var sql = "SELECT * FROM home";
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.render(__dirname + '/card', { books: result });
  });
});

app.get("/events-orgs", (req, res) => {
  var sql = "SELECT * FROM home";
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.render(__dirname + '/cardOrg', { books: result });
  });
});

app.get("/status", (req, res) => {
  var sql = "SELECT name, status, author FROM home";
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.render(__dirname + '/status', { books: result });
  });
});

app.get('/delete-books',(req,res)=>{
  var sql = "DELETE FROM home where EventTitle=?";

  var EventTitle = req.query.EventTitle;

  con.query(sql, [EventTitle], (err, result) => {
    if (err) throw err;
    res.redirect('/events-orgs')
  });
})

app.get('/update-books',(req,res)=>{
  var sql = "SELECT * FROM home where EventTitle=?";

  var EventTitle = req.query.EventTitle;

  con.query(sql, [EventTitle], (err, result) => {
    if (err) throw err;
    res.render(__dirname+"/update-books",{books:result})
  });
})



app.post('/update-books', (req, res) => {
  var bid = req.body.bid; // Retrieve bid from the request body
  // console.log('Bid:', bid);
  var name = req.body.EventTitle;
  var location = req.body.Location;
  var time = req.body.Time;
  var website = req.body.Website;

  // Check if thumbnail is provided
  if (req.files && req.files.thumbnail) {
    let thumbnail = req.files.thumbnail;
    let uploadPath = __dirname + '/public/' + thumbnail.name;

    thumbnail.mv(uploadPath, (err) => {
      if (err) {
        return res.status(500).send(err);
      }

      var sql = "UPDATE home SET Thumbnail=?, EventTitle=?, Location=?, Time=?, Website=? WHERE bid=?" ;

      con.query(sql, [thumbnail.name, name,location, time, website, bid], (err, result) => {
        if (err) throw err;
        res.redirect('/events-orgs');
      });
    });
  } else {
    // If no thumbnail provided, update other details except the thumbnail
    var sql = "UPDATE home SET EventTitle=?, Location=?, Time=?, Website=? WHERE bid=?" ;
    
    con.query(sql, [name,location, time, website, bid], (err, result) => {
      // console.log('SQL Query:', sql); // Check if the SQL query is correct
      // console.log('Values:', [location, time, website, bid]); // Check if values are correct
      if (err) throw err;
      res.redirect('/events-orgs');
    });
  }
});


// app.post('/update-books', (req, res) => {
//   var name = req.body.name;
//   var type = req.body.type;
//   var status = req.body.status;
//   var score = req.body.score;
//   var author = req.body.author;
//   var completed = req.body.date;
//   var bid = req.body.bid;

//   var sql = "UPDATE home SET name=?, type=?, status=?, score=?, author=?, completed=? WHERE bid=?" ;

//   con.query(sql, [name, type, status, score, author, completed, bid], (err, result) => {
//     if (err) throw err;
//     res.redirect('/');
//   });
// });

app.get('/search-books',(req,res)=>{
  var sql = "SELECT * FROM home";
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.render(__dirname + '/search-books', { books: result });
  });
})

app.get('/search',(req,res)=>{

  var name = req.query.name;
  var author = req.query.author;

    var sql = "SELECT * FROM home WHERE name LIKE '%"+name+"%'AND author LIKE '%"+author+"%'"

    con.query(sql,(err, result)=>{
      if(err) throw error
      res.render(__dirname+"/search-books",{books:result})
    })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
