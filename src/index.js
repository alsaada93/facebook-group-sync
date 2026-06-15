require('dotenv').config();
const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL;
const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD;
const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/1671827262887609/';
const API_ENDPOINT = 'https://www.alsaada.sale/api/public/facebook-sync';
const API_SECRET = 'bc2c71c82cfa4b6682df3d170e96755b33c2fb503b9b41dfae8a113e325faeaa';
const DB_FILE = path.join(__dirname, 'synced_posts.json');

// Load synced posts to prevent duplicates
function loadSyncedPosts() {
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return [];
}

// Save synced posts
function saveSyncedPosts(posts) {
  fs.writeFileSync(DB_FILE, JSON.stringify(posts, null, 2));
}

// Check if post already synced
function isPostSynced(postId, syncedPosts) {
  return syncedPosts.some(p => p.post_id === postId);
}

// Login to Facebook
async function loginToFacebook(page) {
  console.log('Logging in to Facebook...');
  await page.goto('https://www.facebook.com/login/', { waitUntil: 'networkidle' });
  
  await page.fill('input[name="email"]', FACEBOOK_EMAIL);
  await page.fill('input[name="pass"]', FACEBOOK_PASSWORD);
  await page.click('button[name="login"]');
  
  // Wait for login to complete
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log('✓ Successfully logged in');
}

// Extract posts from the group
async function extractPosts(page) {
  console.log('Navigating to Facebook group...');
  await page.goto(FACEBOOK_GROUP_URL, { waitUntil: 'networkidle' });
  
  // Scroll to load more posts
  let previousHeight = 0;
  for (let i = 0; i < 3; i++) {
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  }

  console.log('Extracting posts...');
  const posts = await page.evaluate(() => {
    const postElements = document.querySelectorAll('[data-testid="feed_story_container"]');
    const posts = [];

    postElements.forEach(element => {
      try {
        // Extract post ID from data attributes
        const postId = element.getAttribute('data-postid') || element.getAttribute('id') || '';
        
        // Extract author name
        const authorElement = element.querySelector('[data-hovercard-type="user"] span');
        const authorName = authorElement ? authorElement.innerText : 'Unknown';
        
        // Extract post text
        const textElement = element.querySelector('[data-testid="post_message"]');
        const postText = textElement ? textElement.innerText : '';
        
        // Extract images
        const imageElements = element.querySelectorAll('img[alt=""], img:not([alt])');
        const images = Array.from(imageElements)
          .map(img => img.src)
          .filter(src => src && src.includes('facebook.com/'));
        
        // Extract post URL
        const linkElement = element.querySelector('a[href*="/groups/"]');
        const postUrl = linkElement ? linkElement.href : '';
        
        // Extract created time
        const timeElement = element.querySelector('abbr[data-utime]');
        const createdTime = timeElement ? timeElement.getAttribute('data-utime') : new Date().toISOString();

        if (postId) {
          posts.push({
            post_id: postId,
            author_name: authorName,
            post_text: postText,
            images: images,
            post_url: postUrl,
            created_time: createdTime
          });
        }
      } catch (error) {
        console.error('Error extracting post:', error);
      }
    });

    return posts;
  });

  return posts;
}

// Send post to API
async function sendPostToAPI(post) {
  try {
    const payload = {
      action: 'upsert',
      post_id: post.post_id,
      author_name: post.author_name,
      post_text: post.post_text,
      images: post.images,
      post_url: post.post_url,
      created_time: post.created_time
    };

    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': API_SECRET
      }
    });

    console.log(`✓ Post ${post.post_id} sent successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send post ${post.post_id}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login to Facebook
    await loginToFacebook(page);
    
    // Load synced posts
    let syncedPosts = loadSyncedPosts();
    
    // Extract posts from group
    const posts = await extractPosts(page);
    console.log(`Found ${posts.length} posts`);
    
    // Filter new posts and send to API
    let newPostsCount = 0;
    for (const post of posts) {
      if (!isPostSynced(post.post_id, syncedPosts)) {
        console.log(`\nProcessing new post: ${post.post_id}`);
        console.log(`Author: ${post.author_name}`);
        console.log(`Text: ${post.post_text.substring(0, 100)}...`);
        
        const sent = await sendPostToAPI(post);
        if (sent) {
          syncedPosts.push(post);
          newPostsCount++;
        }
      }
    }
    
    // Save synced posts
    saveSyncedPosts(syncedPosts);
    
    console.log(`\n✓ Sync complete! ${newPostsCount} new posts synced.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
main().catch(console.error);
