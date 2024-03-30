import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const SEARCH_API_URL = "https://openlibrary.org/search.json?q=";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "Lucyhelen5",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let posts = [];

//FUNCTIONS
function convertTitleToUrl(title) {
  return title.trim().replace(/\s+/g, '+');
}

//GETTING ALL THE POSTS

async function getPosts() {
  posts = [];
  const result = await db.query("SELECT * FROM book_info");

  result.rows.forEach((post) => {
    posts.push(post);
  });

  return posts;
}

//GETTING THE POST BASED ON IT'S ID

async function getPostById(id) {
  const result = await db.query(
    "SELECT title, rating, description, notes FROM book_info WHERE id = $1 ",
    [id]
  );

  const post = result.rows[0];
  return post;
}

// GETTING THE HOMEPAGE AND THE [PSTS]

app.get("/", async (req, res) => {
  try {
    const posts = await getPosts();
    // const result = await axios.get(SEARCH_API_URL);
    res.render("index.ejs", {
      posts: posts,
    });
  } catch (error) {
    console.log(error);
  }
});

//GETTING THE INDIVIDUAL POST BASED ON IT'S ID
app.get("/posts/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await getPostById(postId);
    res.render("post.ejs", {
      post: post,
    });
  } catch (error) {
    console.log(error);
  }
});

//ADD A BOOK ENTRY TO DATA BASE

app.post("/add", async (req, res) => {
  const post = req.body;

  try {
    await db.query(
      " INSERT INTO book_info (title, rating, description, notes) VALUES ($1, $2, $3, $4)",
      [post.title, post.rating, post.description, post.notes]
    );
  } catch (error) {
    console.log(error);
  }

  res.redirect("/");
});

//EDIT AN ENTRY
//NEED TO finish the SQL code in try catch block
// app.post("/edit", async (req, res) => {
//   const post = req.body;

//   console.log(post);

//   try {
//     await db.query(
//       "UPDATE book_info SET title = ($1), rating = ($2), description = ($3), notes = ($4) WHERE id = ($5)",
//       [
//         post.updatedTitle,
//         post.updatedRating,
//         post.updatedDescription,
//         post.updatedNotes,
//         post.updatedPostId,
//       ]
//     );

//     // res.render("index.ejs", {
//     //   post: post,
//     // });
//   } catch (error) {
//     console.log(error);
//   }

//   res.redirect("/");
// });


app.post("/edit", async (req, res) => {
  const action = req.body.action;
   const post = req.body;

  try {
    if (action === "delete") {
      await db.query("DELETE FROM book_info WHERE id = $1", [
        post.updatedPostId,
      ]);
    } else if (action === "update") {
      // Your update logic goes here
      await db.query(
        "UPDATE book_info SET title = ($1), rating = ($2), description = ($3), notes = ($4) WHERE id = ($5)",
        [
          post.updatedTitle,
          post.updatedRating,
          post.updatedDescription,
          post.updatedNotes,
          post.updatedPostId,
        ]
      );
    }
  } catch (error) {
    console.log(error);
  }

  res.redirect("/");
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


  