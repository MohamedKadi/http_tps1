// GET
fetch("https://httpbin.org/get")
  .then((r) => r.json())
  .then(console.log);

// POST
fetch("https://httpbin.org/post", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "John", age: 30 }),
})
  .then((r) => r.json())
  .then(console.log);
