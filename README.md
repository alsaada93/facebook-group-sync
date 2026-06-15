# Facebook Group Sync

Automated bot to sync Facebook group posts to an external API using Playwright and Node.js.

## Features

- 🤖 Automated Facebook login
- 📱 Post extraction (ID, author, text, images, URL, timestamp)
- 🔄 Duplicate prevention
- 🚀 API integration with authentication
- ⏰ Scheduled execution (GitHub Actions every 15 minutes)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and add your Facebook credentials:
```
FACEBOOK_EMAIL=your_email@gmail.com
FACEBOOK_PASSWORD=your_password
```

### 3. Run locally

```bash
npm start
```

## How it works

1. **Login**: Authenticates to Facebook with provided credentials
2. **Scrape**: Visits the Facebook group and extracts all posts
3. **Filter**: Checks against local database to prevent duplicates
4. **Sync**: Sends new posts to the API endpoint
5. **Store**: Saves post IDs locally to prevent future duplicates

## API Endpoint

**URL**: `https://www.alsaada.sale/api/public/facebook-sync`

**Headers**:
- `Content-Type: application/json`
- `x-sync-secret: bc2c71c82cfa4b6682df3d170e96755b33c2fb503b9b41dfae8a113e325faeaa`

**Payload**:
```json
{
  "action": "upsert",
  "post_id": "string",
  "author_name": "string",
  "post_text": "string",
  "images": ["url1", "url2"],
  "post_url": "string",
  "created_time": "ISO8601 timestamp"
}
```

## GitHub Actions Workflow

The bot runs automatically every 15 minutes via `.github/workflows/sync.yml`

## File Structure

```
├── src/
│   └── index.js           # Main script
├── .github/
│   └── workflows/
│       └── sync.yml       # GitHub Actions workflow
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies
└── synced_posts.json      # Local duplicate prevention DB
```

## License

ISC
