# 📚 CM360 Tag Validation - Complete Knowledge Base

## Learned from Official Google CM360 Documentation

### 🔐 1. CRITICAL PAIRING RULE
**⚠️ NEVER implement a JUMP tag without a corresponding AD tag!**
- **Ad Tag** (`/ddm/ad/`): Serves the ad creative and counts impressions
- **Jump Tag** (`/ddm/jump/`): Tracks clicks when user clicks the ad
- **Must Match**: Campaign IDs, placement IDs, dimensions (sz=)
- **ord= Values**: Should be IDENTICAL in both tags when served together
- **Without both**: No impressions or clicks will be counted

### 📐 2. Dimension Validation Rules
**ins Tags**:
- `style='display:inline-block;width:XXXpx;height:XXXpx'` must match placement size exactly
- Example: 300x250 placement → `width:300px;height:250px`

**Standard Tags**:
- `sz=widthxheight` parameter must match placement size
- Example: 300x250 placement → `sz=300x250`

**Interstitial Exceptions**:
- Full-screen ads may omit sz= parameter
- Dimensions can be flexible for interstitials

**Video/VAST Tags**:
- `sz=0x0` for all VAST placements (audio/video)
- Actual video dimensions specified in creative assets

### 🔧 3. ins Tag Requirements (Modern Implementation)

**REQUIRED Attributes**:
```html
<ins class='dcmads'                              ← MUST have this class
  style='display:inline-block;width:XXXpx;height:XXXpx'  ← Dimensions
  data-dcm-placement='Nxxxx.site/Bxxxx'          ← Placement ID
  data-dcm-rendering-mode='iframe|script'>        ← Render method
  <script src='https://www.googletagservices.com/dcm/dcmads.js'></script>
</ins>
```

**STRONGLY RECOMMENDED Attributes**:
- `data-dcm-https-only` - Security (HTTPS enforcement)
- `data-dcm-gdpr-applies='gdpr=${GDPR}'` - GDPR compliance
- `data-dcm-gdpr-consent='gdpr_consent=${GDPR_CONSENT_755}'` - Consent string
- `data-dcm-addtl-consent='addtl_consent=${ADDTL_CONSENT}'` - Additional consent
- `data-dcm-ltd='false|true'` - Limited ad tracking indicator

**Mobile/App Attributes**:
- `data-dcm-resettable-device-id=''` - For dc_rdid parameter
- `data-dcm-app-id=''` - For dc_msid parameter (app ID)

**Key Features**:
- ✅ Auto cache-busting (no ord= needed)
- ✅ Cleaner HTML5 implementation
- ✅ Supports both iframe and script rendering
- ✅ Preferred for modern trafficking

### 🎯 4. Cache Busting Validation

**Standard Tags**:
- `ord=[timestamp]` MUST be replaced by publisher
- Publisher replaces with: random number, timestamp, or RNG
- **Purpose**: Prevents browser caching, ensures accurate impression counting
- **Without it**: Severe impression discrepancies

**Common Publisher Replacements**:
- Google Ad Manager: `ord=%n` (RNG macro)
- Other ad servers: `ord=123456789` (dynamically generated number)
- JavaScript: `ord=Math.random()*10000000000000000`

**ins Tags**:
- ✅ Automatically handle cache busting
- ✅ No ord= parameter needed
- ✅ No action required from publisher

### 📱 5. Mobile & App Tracking Requirements

**dc_rdid= Parameter** (CRITICAL for mobile apps):
- **Required for**: In-app conversion tracking
- **iOS**: IDFA (Identifier for Advertisers)
- **Android**: AdID (Advertising ID)
- **Format**: Unhashed, raw value
- **Security**: Only accepted over HTTPS/SSL
- **Publisher must populate**: At ad serve time
- **Without it**: No frequency capping, audience targeting, or conversion tracking in apps

**dc_lat= Parameter**:
- **Values**: `0` or `1`
- **`1` means**: User enabled "Limit Ad Tracking"
- **Purpose**: Opt-out of interest-based ads and remarketing
- **Compliance**: Required for mobile inventory

**tag_for_child_directed_treatment= Parameter**:
- **Values**: `0` or `1`
- **`1` means**: Request may be from user under 13
- **Purpose**: COPPA compliance
- **Alias**: Also appears as `tfua=`

**dc_msid= Parameter** (App ID):
- **Format**: 
  - Android: `com.android.appname` (Play Store package name)
  - iOS: `123456789` (App Store ID)
- **Purpose**: Enable App and App ID reporting dimensions
- **Publisher must populate**: For app-specific reporting

**Example Mobile Tag**:
```html
<ins class='dcmads' style='display:inline-block;width:320px;height:50px'
  data-dcm-placement='N9200.284657.MYSITE/B7841342.2'
  data-dcm-rendering-mode='script'
  data-dcm-https-only
  data-dcm-resettable-device-id=''    ← dc_rdid goes here
  data-dcm-app-id=''                  ← dc_msid goes here
  data-dcm-ltd='false'>                ← dc_lat
  <script src='https://www.googletagservices.com/dcm/dcmads.js'></script>
</ins>
```

### 🔒 6. Privacy & Compliance Parameters

**GDPR Parameters** (Required for EEA traffic):
- `gdpr=${GDPR}` - Whether GDPR applies (0 or 1)
- `gdpr_consent=${GDPR_CONSENT_755}` - IAB TCF consent string
- `addtl_consent=${ADDTL_CONSENT}` - Additional consent providers
- **Purpose**: EU privacy compliance
- **Without them**: Tags may not serve in EEA

**ltd= Parameter**:
- **Values**: `0` or `1`
- **Purpose**: Limited ad tracking indicator
- **Effect when `1`**: 
  - No cookies used/created
  - No DCLID appended to landing page
  - Enhanced attribution unavailable

**COPPA Compliance**:
- `tag_for_child_directed_treatment=` or `tfua=`
- Required for content directed at children under 13
- Affects ad personalization and tracking

### 🎬 7. Video (VAST) Tag Requirements

**VAST Version Support**:
- CM360 is VAST 2.0, 3.0, and 4.0 compliant
- **VAST 2.0**: Basic video ad serving
- **VAST 3.0**: Adds OBA icons, skippable ads (backwards compatible with 2.0)
- **VAST 4.0**: Adds mezzanine files, universal ad IDs (backwards compatible with 3.0)

**Video Tag Identification**:
- Contains `dcmt=text/xml` (MIME type)
- `sz=0x0` for all VAST placements
- `dc_vast=2` or `dc_vast=3` or `dc_vast=4`

**Video-Specific Parameters**:
- `dc_vpm=` - Video playback method (publisher must populate)
- `dc_vconp=` - Video continuous play tracking
- `dc_sdk_apis=[APIFRAMEWORKS]` - API frameworks supported
- `dc_omid_p=[OMIDPARTNER]` - OMID partner name
- `dc_mpos=[BREAKPOSITION]` - Ad break position in video

**Pre-fetch Tags**:
- URL starts with `/ddm/pfadx/` (pre-fetch ad XML)
- Used for in-stream audio and video
- Fetches content before logging impression
- Impression logged only after primary asset buffers

### 🔍 8. Validation Severity Levels

**ERROR (Red) - Must Fix**:
- ❌ Dimension mismatch (tag ≠ placement size)
- ❌ Jump tag without corresponding ad tag
- ❌ HTTP instead of HTTPS
- ❌ Missing `class='dcmads'` in ins tag
- ❌ Missing `data-dcm-placement` in ins tag
- ❌ Missing `<script src='.../dcmads.js'>` in ins tag

**WARNING (Yellow) - Should Fix**:
- ⚠️ `[timestamp]` placeholder not replaced
- ⚠️ Missing GDPR parameters (gdpr, gdpr_consent)
- ⚠️ Missing dc_lat= parameter
- ⚠️ Missing dc_rdid= for mobile/app inventory
- ⚠️ Missing data-dcm-https-only attribute
- ⚠️ Missing data-dcm-rendering-mode

**INFO (Blue) - Be Aware**:
- ℹ️ Placeholder macros present: [APIFRAMEWORKS], [OMIDPARTNER]
- ℹ️ Custom parameters detected
- ℹ️ Non-standard ord= value format

### 🚫 9. Legacy Parameters (Avoid)

**dc_muid=** (deprecated):
- Old parameter for hashed device IDs
- **Use dc_rdid= instead** (unhashed values)
- dc_rdid= is the current best practice

**IP Addresses in Tags**:
- Never use IP addresses (e.g., `123.456.789.0`)
- Always use `ad.doubleclick.net` domain
- Google's IPs are subject to change

**DFA vs DDM**:
- `ddm` = Campaign Manager 360 (current)
- Old `dfa` = DoubleClick for Advertisers (legacy)
- All modern tags use `ddm`

### ✅ 10. Best Practices Checklist

**Before Trafficking**:
- [ ] Verify dimensions match placement size exactly
- [ ] Confirm jump and ad tags are paired
- [ ] Ensure all URLs use HTTPS
- [ ] Check ins tags have all required attributes
- [ ] Verify GDPR parameters are present
- [ ] Confirm mobile parameters (dc_rdid, dc_lat) for app inventory

**For Mobile/App Campaigns**:
- [ ] dc_rdid= parameter included (empty, publisher populates)
- [ ] dc_lat= parameter included (empty, publisher populates)
- [ ] tag_for_child_directed_treatment= included
- [ ] dc_msid= included for App ID reporting
- [ ] All tags use HTTPS (required for device ID acceptance)
- [ ] Publisher confirmed they can populate device IDs

**For Video Campaigns**:
- [ ] Correct VAST version specified (dc_vast=2/3/4)
- [ ] sz=0x0 for all VAST tags
- [ ] dcmt=text/xml present
- [ ] Pre-fetch tags used for in-stream video
- [ ] dc_vpm= placeholder present for publisher

**For GDPR Compliance**:
- [ ] gdpr=${GDPR} parameter present
- [ ] gdpr_consent=${GDPR_CONSENT_755} present
- [ ] addtl_consent=${ADDTL_CONSENT} present
- [ ] ltd= parameter configured correctly

**Cache Busting**:
- [ ] Standard tags: [timestamp] ready for publisher replacement
- [ ] ins tags: No action needed (auto cache-busting)
- [ ] ord= values identical in jump/ad tag pairs

### 🎓 11. Common Mistakes to Avoid

1. **Copying full cells** instead of text from Excel → Adds extra quotes
2. **Implementing jump tag alone** → No impressions counted
3. **Using HTTP** instead of HTTPS → Security rejection
4. **Mismatched dimensions** → Wrong creative serves or no serve
5. **Missing dc_rdid** for mobile → No conversion tracking
6. **Forgetting GDPR params** → Tags blocked in EEA
7. **Not replacing [timestamp]** → Caching issues, wrong counts
8. **Using legacy dc_muid** → Should use dc_rdid= instead

### 📊 12. Reporting Impact

**Without proper tagging**:
- ❌ Missing conversions (no dc_rdid)
- ❌ Impression discrepancies (bad cache-busting)
- ❌ No frequency capping (missing device IDs)
- ❌ No audience targeting (missing dc_rdid)
- ❌ Failed GDPR compliance (missing consent params)
- ❌ No click tracking (missing jump tag)

### 🔗 13. Official Resources

- **CM360 Help Center**: support.google.com/campaignmanager
- **VAST Specifications**: IAB website for VAST 2.0, 3.0, 4.0
- **GDPR Compliance**: IAB Transparency & Consent Framework
- **Mobile Guidelines**: support.google.com/campaignmanager/answer/3285848

---

**Last Updated**: January 2026 from official Google CM360 documentation
