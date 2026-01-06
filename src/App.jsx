import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);

  const extractDimensionsFromTag = (tagHTML) => {
    if (!tagHTML) return null;
    
    // Extract width and height from style attribute
    const widthMatch = tagHTML.match(/width:(\d+)px/);
    const heightMatch = tagHTML.match(/height:(\d+)px/);
    
    if (widthMatch && heightMatch) {
      return `${widthMatch[1]}x${heightMatch[1]}`;
    }
    
    return null;
  };

  const extractURLsFromTag = (tagHTML) => {
    const urls = [];
    
    if (!tagHTML) return urls;
    
    // Extract JavaScript source URL
    const srcMatch = tagHTML.match(/src='([^']+)'/);
    if (srcMatch) {
      urls.push({ type: 'Script', url: srcMatch[1] });
    }
    
    // Extract ad/jump URLs from Internal Redirect Tag
    const imageUrlMatch = tagHTML.match(/Image URL.*?:\s*(https:\/\/[^\s]+)/);
    const clickUrlMatch = tagHTML.match(/Click-Through URL.*?:\s*(https:\/\/[^\s]+)/);
    
    if (imageUrlMatch) {
      urls.push({ type: 'Image URL', url: imageUrlMatch[1] });
    }
    if (clickUrlMatch) {
      urls.push({ type: 'Click-Through URL', url: clickUrlMatch[1] });
    }
    
    return urls;
  };

  const validateTag = async (placementData) => {
    const {
      placementName,
      placementSize,
      iframeTag,
      redirectTag,
    } = placementData;

    const issues = [];
    
    // Validate iframe/JavaScript tag dimensions
    const iframeDimensions = extractDimensionsFromTag(iframeTag);
    if (iframeDimensions && iframeDimensions !== placementSize) {
      issues.push({
        type: 'DIMENSION_MISMATCH',
        severity: 'error',
        message: `Tag dimensions (${iframeDimensions}) don't match placement size (${placementSize})`,
        tagType: 'Iframe/JavaScript Tag'
      });
    }

    // ===== NEW: Enhanced ins Tag Validation =====
    if (iframeTag && iframeTag.includes('<ins')) {
      // Check for required ins tag attributes
      if (!iframeTag.includes("class='dcmads'") && !iframeTag.includes('class="dcmads"')) {
        issues.push({
          type: 'MISSING_INS_CLASS',
          severity: 'error',
          message: "ins tag missing required class='dcmads' attribute",
          tagType: 'ins Tag'
        });
      }
      
      if (!iframeTag.includes('data-dcm-placement=')) {
        issues.push({
          type: 'MISSING_PLACEMENT',
          severity: 'error',
          message: 'ins tag missing required data-dcm-placement attribute',
          tagType: 'ins Tag'
        });
      }
      
      if (!iframeTag.includes('data-dcm-rendering-mode=')) {
        issues.push({
          type: 'MISSING_RENDERING_MODE',
          severity: 'warning',
          message: 'ins tag missing data-dcm-rendering-mode (should be "iframe" or "script")',
          tagType: 'ins Tag'
        });
      }
      
      // Check for HTTPS-only attribute
      if (!iframeTag.includes('data-dcm-https-only')) {
        issues.push({
          type: 'MISSING_HTTPS_ONLY',
          severity: 'warning',
          message: 'ins tag missing data-dcm-https-only attribute for security',
          tagType: 'ins Tag'
        });
      }
      
      // Check for GDPR parameters
      if (!iframeTag.includes('data-dcm-gdpr-applies')) {
        issues.push({
          type: 'MISSING_GDPR',
          severity: 'warning',
          message: 'ins tag missing GDPR compliance attributes (data-dcm-gdpr-applies, data-dcm-gdpr-consent)',
          tagType: 'ins Tag'
        });
      }
      
      // Check for script source
      if (!iframeTag.includes('googletagservices.com/dcm/dcmads.js')) {
        issues.push({
          type: 'MISSING_SCRIPT',
          severity: 'error',
          message: 'ins tag missing required <script src="...dcmads.js"></script>',
          tagType: 'ins Tag'
        });
      }
    }

    // ===== NEW: Cache Busting Validation =====
    if (redirectTag && redirectTag.includes('[timestamp]')) {
      issues.push({
        type: 'UNREPLACED_TIMESTAMP',
        severity: 'warning',
        message: '[timestamp] placeholder must be replaced with dynamic cache-busting value by publisher',
        tagType: 'Cache Busting'
      });
    }

    // ===== NEW: Jump/Ad Tag Pairing =====
    const hasJumpTag = redirectTag && redirectTag.includes('/ddm/jump/');
    const hasAdTag = redirectTag && redirectTag.includes('/ddm/ad/');
    
    if (hasJumpTag && !hasAdTag) {
      issues.push({
        type: 'MISSING_AD_TAG_PAIR',
        severity: 'error',
        message: 'CRITICAL: Jump tag present without corresponding Ad tag. Never implement a jump tag alone!',
        tagType: 'Tag Pairing'
      });
    }

    // Extract URLs for validation
    const urls = extractURLsFromTag(redirectTag);
    
    // Validate URLs
    for (const urlInfo of urls) {
      // Check HTTPS
      if (!urlInfo.url.startsWith('https://')) {
        issues.push({
          type: 'INSECURE_URL',
          severity: 'error',
          message: `${urlInfo.type} is not using HTTPS (security requirement)`,
          url: urlInfo.url
        });
      }
      
      // ===== NEW: Check for required privacy parameters =====
      if (urlInfo.type === 'Image URL' || urlInfo.type === 'Click-Through URL') {
        if (!urlInfo.url.includes('dc_lat=')) {
          issues.push({
            type: 'MISSING_DC_LAT',
            severity: 'warning',
            message: `${urlInfo.type} missing dc_lat= parameter (Limit Ad Tracking)`,
            url: urlInfo.url
          });
        }
        
        if (!urlInfo.url.includes('gdpr=') && !urlInfo.url.includes('${GDPR}')) {
          issues.push({
            type: 'MISSING_GDPR_PARAM',
            severity: 'warning',
            message: `${urlInfo.type} missing GDPR parameters`,
            url: urlInfo.url
          });
        }
      }
      
      // Check for placeholder macros that need replacement
      if (urlInfo.url.includes('[APIFRAMEWORKS]') || urlInfo.url.includes('[OMIDPARTNER]')) {
        issues.push({
          type: 'PLACEHOLDER_MACRO',
          severity: 'info',
          message: `${urlInfo.type} contains placeholder macros: [APIFRAMEWORKS] or [OMIDPARTNER]`,
          url: urlInfo.url
        });
      }
    }

    return {
      placementName,
      placementSize,
      iframeDimensions,
      urls,
      issues,
      status: issues.some(i => i.severity === 'error') ? 'error' : 
              issues.some(i => i.severity === 'warning') ? 'warning' : 'success'
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsValidating(true);
    setError(null);
    setValidationResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Find header row (row with "Placement Name")
      const headerRowIndex = jsonData.findIndex(row => 
        row.some(cell => cell === 'Placement Name')
      );

      if (headerRowIndex === -1) {
        throw new Error('Could not find header row with "Placement Name"');
      }

      const headers = jsonData[headerRowIndex];
      const placementNameCol = headers.indexOf('Placement Name');
      const dimensionsCol = headers.indexOf('Dimensions');
      const iframeTagCol = headers.indexOf('Iframes/JavaScript Tag');
      const redirectTagCol = headers.indexOf('Internal Redirect Tag');

      // Process each placement row
      const placements = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[placementNameCol]) {
          placements.push({
            placementName: row[placementNameCol],
            placementSize: row[dimensionsCol],
            iframeTag: row[iframeTagCol],
            redirectTag: row[redirectTagCol],
          });
        }
      }

      // Validate each placement
      const results = await Promise.all(
        placements.map(placement => validateTag(placement))
      );

      setValidationResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'var(--error)';
      case 'warning': return 'var(--warning)';
      case 'info': return 'var(--info)';
      default: return 'var(--success)';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '✅';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '✅';
    }
  };

  const stats = validationResults ? {
    total: validationResults.length,
    errors: validationResults.filter(r => r.status === 'error').length,
    warnings: validationResults.filter(r => r.status === 'warning').length,
    success: validationResults.filter(r => r.status === 'success').length,
  } : null;

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1 className="title">
          <span className="emoji">🔍</span>
          CM360 Tag Validator
        </h1>
        <p className="subtitle">
          Validate ad tag dimensions and URLs instantly
        </p>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-icon">📤</div>
          <h2 className="upload-title">Upload Tag Sheet</h2>
          <p className="upload-description">
            Upload your CM360 tag export (.xls, .xlsx)
          </p>
          <label className="upload-button">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            Choose File
          </label>
        </div>
      </div>

      {/* Loading State */}
      {isValidating && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Validating tags...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-alert">
          <span className="error-icon">❌</span>
          <div>
            <div className="error-title">Error</div>
            <div className="error-message">{error}</div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Placements</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card success-card">
            <div className="stat-label">✅ Passed</div>
            <div className="stat-value">{stats.success}</div>
          </div>
          <div className="stat-card warning-card">
            <div className="stat-label">⚠️ Warnings</div>
            <div className="stat-value">{stats.warnings}</div>
          </div>
          <div className="stat-card error-card">
            <div className="stat-label">❌ Errors</div>
            <div className="stat-value">{stats.errors}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {validationResults && (
        <div className="results-section">
          <h2 className="results-title">
            <span className="emoji">📊</span>
            Validation Results
          </h2>
          
          <div className="results-list">
            {validationResults.map((result, index) => (
              <div key={index} className={`result-card ${result.status}`}>
                {/* Header */}
                <div className="result-header">
                  <div className="result-info">
                    <span className="result-status-icon">
                      {getStatusIcon(result.status)}
                    </span>
                    <div>
                      <div className="result-name">{result.placementName}</div>
                      <div className="result-size">
                        Placement Size: <strong>{result.placementSize}</strong>
                        {result.iframeDimensions && (
                          <> | Tag Dimensions: <strong>{result.iframeDimensions}</strong></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div className="issues-section">
                    <div className="issues-title">Issues Found:</div>
                    {result.issues.map((issue, issueIndex) => (
                      <div key={issueIndex} className="issue-item" style={{
                        borderLeftColor: getSeverityColor(issue.severity)
                      }}>
                        <span className="issue-icon">
                          {getSeverityIcon(issue.severity)}
                        </span>
                        <div className="issue-content">
                          <div className="issue-message">{issue.message}</div>
                          {issue.tagType && (
                            <div className="issue-meta">Tag: {issue.tagType}</div>
                          )}
                          {issue.url && (
                            <div className="issue-url">{issue.url}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* URLs */}
                {result.urls.length > 0 && (
                  <div className="urls-section">
                    <div className="urls-title">Extracted URLs:</div>
                    {result.urls.map((urlInfo, urlIndex) => (
                      <div key={urlIndex} className="url-item">
                        <span className="url-type">{urlInfo.type}:</span>
                        <a 
                          href={urlInfo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="url-link"
                        >
                          {urlInfo.url.substring(0, 80)}
                          {urlInfo.url.length > 80 && '...'}
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Success Message */}
                {result.issues.length === 0 && (
                  <div className="success-message">
                    ✅ All validations passed!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!validationResults && !isValidating && !error && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">Upload a tag sheet to get started</p>
        </div>
      )}
    </div>
  );
}

export default App;
