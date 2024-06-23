# Next.js Translation App

This project is a Next.js-based web application that provides translation services using OpenAI's GPT models. It supports translation between various languages and can handle both short and long texts efficiently.

## Features

- Translate text between multiple languages
- Support for country-specific language variants
- Handles long texts by splitting them into manageable chunks
- Uses OpenAI's GPT models for high-quality translations
- Implements a two-step translation process with reflection and improvement
- Built with Next.js 14+, using App Router and Server Actions
- Styled with Tailwind CSS
- Utilizes Vercel AI SDK for efficient AI integrations

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or later)
- npm (v6 or later)
- An OpenAI API key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/nextjs-translation-app.git
   cd nextjs-translation-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Note: Next.js has built-in support for environment variables, so you don't need to install any additional packages to use them.

## Usage

To start the development server:

```
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
translation-app/
├── app/
│   ├── api/
│   │   └── translate/
│   │       └── route.js
│   ├── page.js
│   └── layout.js
├── components/
│   ├── TranslationForm.js
│   └── TranslationResult.js
├── lib/
│   └── translation.js
├── .env.local
└── next.config.js
```

- `app/`: Contains the main application pages and API routes
- `components/`: Reusable React components
- `lib/`: Utility functions and translation logic
- `.env.local`: Environment variables (not tracked in git)
- `next.config.js`: Next.js configuration file

## Key Components

- `TranslationForm.js`: Handles user input for source language, target language, country, and text to translate
- `TranslationResult.js`: Displays the translation result
- `translation.js`: Contains the core translation logic, including text chunking and OpenAI API interactions

## API

The application exposes a single API endpoint:

- `POST /api/translate`: Accepts translation parameters and returns the translated text

## Environment Variables

This project uses Next.js built-in support for environment variables. You can use `.env.local` for local development and environment-specific files like `.env.production` for production settings. Remember not to commit these files to version control.

## Contributing

Contributions to this project are welcome. Please ensure you follow the existing code style and add unit tests for any new features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the GPT models
- Vercel for the Next.js framework and AI SDK
- The developers of all the open-source libraries used in this project