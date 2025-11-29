# Google Maps API Configuration Guide

## Overview

ArtiConnect uses Google Maps APIs for:
- **Geocoding**: Converting addresses to coordinates
- **Reverse Geocoding**: Converting coordinates to addresses
- **Distance Calculation**: Finding nearby artisans
- **Address Autocomplete**: Suggesting addresses as users type

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project (required for Maps APIs)

### 2. Enable Required APIs

Navigate to **APIs & Services > Library** and enable:

- ✅ **Geocoding API** - Address to coordinates conversion
- ✅ **Maps JavaScript API** - Interactive maps (frontend)
- ✅ **Places API** - Address autocomplete

### 3. Create API Keys

#### Backend API Key (Server-side)

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Click **Restrict Key** and configure:
   - **Application restrictions**: IP addresses (your server IPs)
   - **API restrictions**: Geocoding API only

Add to your `.env.production`:
```env
GOOGLE_MAPS_API_KEY=AIzaSy...your-backend-key
```

#### Frontend API Key (Client-side)

1. Create another API key
2. Configure restrictions:
   - **Application restrictions**: HTTP referrers
   - **Website restrictions**:
     - `https://articonnect.lu/*`
     - `https://www.articonnect.lu/*`
   - **API restrictions**: Maps JavaScript API, Places API

Add to your frontend `.env.production`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...your-frontend-key
```

### 4. API Key Security Best Practices

⚠️ **IMPORTANT**: Never expose your server-side API key in frontend code!

| Key Type | Restrictions | Usage |
|----------|-------------|-------|
| Backend | IP-restricted | Geocoding on server |
| Frontend | HTTP referrer restricted | Maps, Autocomplete |

### 5. Usage Limits & Costs

Google Maps Platform offers $200 free credit monthly. Typical costs:

| API | Free Tier | Cost After |
|-----|-----------|------------|
| Geocoding | 40,000 requests/month | $5/1,000 |
| Maps JavaScript | 28,000 loads/month | $7/1,000 |
| Places Autocomplete | 28,000 sessions/month | $2.83/1,000 |

**Estimated Monthly Costs for ArtiConnect:**
- Small (100 users): ~$0 (within free tier)
- Medium (1,000 users): ~$20-50
- Large (10,000 users): ~$200-500

### 6. Environment Configuration

#### Backend (.env.production)
```env
# Google Maps API (Server-side)
GOOGLE_MAPS_API_KEY=AIzaSy...your-backend-key

# Optional: Enable caching to reduce API calls
GEOCODING_CACHE_TTL=86400  # 24 hours
```

#### Frontend (.env.production)
```env
# Google Maps API (Client-side)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...your-frontend-key
```

### 7. Fallback Behavior

If Google Maps API is not configured, ArtiConnect will:

1. **Geocoding**: Fall back to Luxembourg center coordinates (49.6116, 6.1319)
2. **Distance**: Use simple Haversine formula calculation
3. **Autocomplete**: Disable address suggestions

This ensures the application works without Google Maps, but with limited functionality.

### 8. Testing the Configuration

#### Test Geocoding (Backend)

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1+rue+de+la+Gare+Luxembourg&key=YOUR_API_KEY"
```

Expected response includes `status: "OK"` and coordinates.

#### Test in Application

1. Start the backend with the API key configured
2. Create a mission with an address
3. Check logs for geocoding results:
   ```
   [GeoService] Geocoded: 1 rue de la Gare -> 49.6116, 6.1319
   ```

### 9. Monitoring & Quotas

#### View Usage
1. Go to Google Cloud Console
2. Navigate to **APIs & Services > Dashboard**
3. Select the specific API to see:
   - Requests per day
   - Error rate
   - Latency

#### Set Budget Alerts
1. Go to **Billing > Budgets & Alerts**
2. Create a budget for your Maps usage
3. Set email alerts at 50%, 90%, 100%

### 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| `REQUEST_DENIED` | Check API key restrictions |
| `OVER_QUERY_LIMIT` | Implement caching, check quotas |
| `ZERO_RESULTS` | Address not found, try different format |
| `INVALID_REQUEST` | Check address format, encoding |

#### Common Errors

**Error: API key not valid**
```
{
  "status": "REQUEST_DENIED",
  "error_message": "The provided API key is invalid."
}
```
Solution: Verify the key is correct and the API is enabled.

**Error: This API key is not authorized**
```
{
  "status": "REQUEST_DENIED",
  "error_message": "This API key is not authorized to use this service."
}
```
Solution: Check API restrictions in Cloud Console.

### 11. Alternative Providers

If you prefer not to use Google Maps, ArtiConnect can be configured with:

- **OpenStreetMap/Nominatim** (free, self-hosted option)
- **Mapbox** (alternative commercial provider)
- **HERE Maps** (enterprise option)

Contact the development team for integration assistance.

---

## Quick Start Checklist

- [ ] Create Google Cloud project
- [ ] Enable Geocoding API
- [ ] Enable Maps JavaScript API
- [ ] Enable Places API
- [ ] Create backend API key with IP restrictions
- [ ] Create frontend API key with HTTP referrer restrictions
- [ ] Add keys to `.env.production` files
- [ ] Test geocoding endpoint
- [ ] Set up billing alerts
- [ ] Monitor usage in Cloud Console

## Support

For configuration assistance, contact:
- Email: support@articonnect.lu
- Documentation: https://docs.articonnect.lu
