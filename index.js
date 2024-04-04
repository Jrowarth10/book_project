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
  return title.trim().replace(/\s+/g, "+");
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
//NEED TO NOW FETCH THE BOOK COVER AND DISPLAY ITR USING THE ISBN CODES FETCHED

app.get("/", async (req, res) => {
  try {
    const posts = await getPosts();

    res.render("index.ejs", {
      posts: posts,
      // images: images
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
  const urlTitle = convertTitleToUrl(post.title);

  try {
    // Insert other fields
    const result = await db.query(
      "INSERT INTO book_info (title, rating, description, notes, url_title) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [post.title, post.rating, post.description, post.notes, urlTitle]
    );

    const newBookId = result.rows[0].id; // Get the ID of the newly inserted row

    const response = await axios.get(`${SEARCH_API_URL}${urlTitle}`);
    const bookData = response.data;

    if (bookData && bookData.docs && bookData.docs.length > 0) {
      const book = bookData.docs[0];
      // Check if the first book has 'isbn' array and it's not empty
      if (book.isbn && book.isbn.length > 0) {
        const firstIsbn = book.isbn[0];
        try {
          const imageResponse = await axios.get(
            `https://covers.openlibrary.org/b/isbn/${firstIsbn}-M.jpg`,
            { responseType: "arraybuffer" }
          );
          const imageData = Buffer.from(imageResponse.data, "binary").toString(
            "base64"
          );

          // Update the row with image data
          await db.query(
            "UPDATE book_info SET imagecolumn = $1 WHERE id = $2",
            [`data:image/jpeg;base64,${imageData}`, newBookId]
          );
        } catch (error) {
          console.log(error);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }

  res.redirect("/");
});

//EDIT AND DELETE AN ENTRY

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
