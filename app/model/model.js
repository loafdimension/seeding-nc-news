const db = require("../../db/connection");

const selectTopics = () => {
  return db.query(`SELECT * FROM topics;`).then((result) => {
    return result.rows;
  });
};

const selectArticlesByID = (article_id) => {
  return selectArticles(undefined, undefined, undefined, article_id).then(
    (rows) => {
      const article = rows[0];

      if (!article) {
        return Promise.reject({
          status: 404,
          msg: "404: Error",
        });
      } else {
        return article;
      }
    }
  );
};

const selectArticles = (
  sort_by = "created_at",
  order = "DESC",
  topic,
  article_id
) => {
  const greenlistColumnValues = [
    "author",
    "article_id",
    "title",
    "topic",
    "created_at",
    "votes",
    "article_img_url",
    "comment_count",
  ];

  const greenlistOrderValues = ["asc", "desc", "ASC", "DESC"];

  if (!greenlistColumnValues.includes(sort_by)) {
    return Promise.reject({ status: 400, msg: "400: Invalid sort_by value" });
  }

  if (!greenlistOrderValues.includes(order)) {
    return Promise.reject({ status: 400, msg: "400: Invalid order value" });
  }

  const checkTopicExists = topic
    ? db
        .query(`SELECT * FROM topics WHERE slug = $1`, [topic])
        .then((result) => {
          if (result.rows.length === 0) {
            return Promise.reject({ status: 404, msg: "404: Topic not found" });
          }
        })
    : Promise.resolve();

  return checkTopicExists.then(() => {
    let queryValues = [];
    let conditions = [];

    if (topic) {
      queryValues.push(topic);
      conditions.push(`articles.topic = $${queryValues.length}`);
    }

    if (article_id) {
      queryValues.push(article_id);
      conditions.push(`articles.article_id = $${queryValues.length}`);
    }

    let queryStr = `
  SELECT 
    articles.article_id,
    articles.title,
    articles.topic,
    articles.author,
    articles.body, 
    articles.created_at,
    articles.votes,
    articles.article_img_url,
    COUNT(comments.comment_id)::INT AS comment_count
  FROM articles
  LEFT JOIN comments ON articles.article_id = comments.article_id`;

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(" AND ")} `;
    }

    queryStr += `
    GROUP BY articles.article_id
    ORDER BY ${
      sort_by === "comment_count"
        ? "COUNT(comments.comment_id)"
        : `articles.${sort_by}`
    } ${order}
  `;

    return db
      .query(queryStr, queryValues)
      .then((result) => {
        return result.rows;
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  });
};

const selectArticleCommentsByArticleID = (article_id) => {
  return db
    .query(
      `SELECT * FROM comments WHERE article_id = $1 ORDER BY created_at DESC;`,
      [article_id]
    )
    .then(({ rows }) => {
      const comments = rows;

      if (!comments || comments.length === 0) {
        return Promise.reject({
          status: 404,
          msg: "404: Error",
        });
      } else {
        return comments;
      }
    });
};

const insertArticleCommentByArticleID = (article_id, username, body) => {
  return db
    .query(`SELECT * FROM users WHERE username = $1`, [username])
    .then((usernameResult) => {
      if (usernameResult.rows.length === 0) {
        return Promise.reject({
          status: 404,
          msg: "404: User not found",
        });
      }
      const query = `INSERT INTO comments (article_id, author, body)
    VALUES ($1, $2, $3)
    RETURNING *;`;
      return db.query(query, [article_id, username, body]);
    })
    .then((result) => {
      if (result.rows.length === 0) {
        return Promise.reject({
          status: 500,
          msg: "Failed to insert comment - No comment inserted",
        });
      }
      return result.rows[0];
    });
};

const updateArticleVotes = (inc_votes, article_id) => {
  return db
    .query(
      `UPDATE articles SET votes = votes + $1 WHERE article_id = $2 RETURNING *`,
      [inc_votes, article_id]
    )
    .then((result) => {
      if (result.rows.length === 0) {
        return Promise.reject({
          status: 404,
          msg: "404: Article not found",
        });
      }
      return result.rows[0];
    });
};

const deleteCommentByCommentID = (comment_id) => {
  return db
    .query(`DELETE FROM comments WHERE comment_id = $1 RETURNING *`, [
      comment_id,
    ])
    .then((result) => {
      if (result.rows.length === 0) {
        return Promise.reject({
          status: 404,
          msg: "404: Comment not found",
        });
      }
    });
};

const selectUsers = () => {
  return db.query(`SELECT * FROM users;`).then((result) => {
    return result.rows;
  });
};

module.exports = {
  selectTopics,
  selectArticlesByID,
  selectArticles,
  selectArticleCommentsByArticleID,
  insertArticleCommentByArticleID,
  updateArticleVotes,
  deleteCommentByCommentID,
  selectUsers,
};
