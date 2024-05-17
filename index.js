const OpenAI = require("openai");
const dotenv = require("dotenv");
const fs = require("fs");
const readline = require("readline");
const { default: slugify } = require("slugify");
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the subject of the slide deck: ", async (subject) => {
  const prompt = `Create an outline for a slide deck about ${subject}.  Provide each title as a separate sentence, not as bullet points or a numbered list.`;
  // Generate outline
  console.log("Generating outline...");

  const outlineRes = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
  });

  let outline = outlineRes.choices[0].message.content
    .trim()
    .split("\n")
    .filter((line) => line !== "");
  let slides = [];
  for (let title of outline) {
    // Generate slide content
    console.log(`Generating content for slide titled '${title}'...`);

    const contentRes = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Write short presentation content for a presentation slide about ${subject} titled '${title}'. \n\nTitle and content format must be in markdown. Don't include the title in first slide. Use heading 2 for all titles. \n\nFit the title and content to screen. No more then 3 sentences per slice and no more than 100 hundred characters per slide. Max bullet points per slide is 3. Use the language of the subject.`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    let content = contentRes.choices[0].message.content;
    let slideContent = content;

    // Default case for simple text content
    slides.push(`
          ${slideContent}
        `);
  }

  // Write slides to HTML file
  console.log("Writing slides to HTML file...");
  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/reveal.js/dist/reveal.css">
        <link rel="stylesheet" href="styles.css">
        <link rel="stylesheet" href="https://unpkg.com/reveal.js/dist/theme/white.css">
      </head>
      <body>
        <div class="reveal">
        <div class="slides">
        <img src="https://seenons.com/wp-content/uploads/2023/08/SEN_Logo.svg" alt="Seenons Logo" class="logo" style="display: block; margin: 0 auto;">
        <section data-markdown>
        <textarea data-template>
            ${slides.join("\n---\n")}
            </textarea>
            </section>
            </div>
        </div>
        <script src="./node_modules/reveal.js/dist/reveal.js"></script>
        <script src="./node_modules/reveal.js/plugin/markdown/markdown.js"></script>
        <script>
        let deck = new Reveal({
            plugins: [ RevealMarkdown ]
        });
        deck.initialize();
        </script>
      </body>
    </html>
  `;
  // Use slugified subject as filename
  const filename = slugify(subject, { lower: true, strict: true });
  console.log(`Writing slides to ${filename}.html`);
  fs.writeFileSync(`${filename}.html`, html);

  rl.close();
});
