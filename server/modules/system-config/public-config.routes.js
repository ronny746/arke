const express = require('express');
const router = express.Router();
const SystemConfig = require('./system-config.model');
const { successResponse } = require('../../common/responses');
const { normalizeReleaseNotes } = require('./release-notes');

router.get('/', async (req, res, next) => {
  try {
    // For public settings, we just fetch the default/first institute's config
    const config = await SystemConfig.findOne();
    
    const defaultNeetConfig = {
      examTitle: "NEET UG 2026",
      examDate: "2026-05-03T10:00:00.000Z",
      targetDateLabel: "Expected May 2026 (Tentative)",
      isTentative: true,
      startDate: "2025-06-01T00:00:00.000Z",
      subtitle: "Stay focused. Every day brings you closer to your dream medical college! 🎯",
      daysLabel: "DAYS LEFT"
    };

    // Return only non-sensitive settings
    const publicSettings = {
      enableRollNumberLogin: config?.authSettings?.enableRollNumberLogin ?? true,
      enableStudentPasswordLogin: config?.authSettings?.enableStudentPasswordLogin === true,
      appUpdate: {
        latestVersion: config?.appUpdate?.latestVersion || "1.0.0",
        minRequiredVersion: config?.appUpdate?.minRequiredVersion || "1.0.0",
        isMandatory: config?.appUpdate?.isMandatory ?? false,
        updateUrl: config?.appUpdate?.updateUrl || "https://play.google.com/store/apps/details?id=com.arkescholarsneet.online",
        updateNotes: config?.appUpdate?.updateNotes || "New version available with enhanced performance and features!"
      },
      releaseNotes: normalizeReleaseNotes(config?.releaseNotes || []),
      neetExamConfig: {
        examTitle: config?.neetExamConfig?.examTitle || defaultNeetConfig.examTitle,
        examDate: config?.neetExamConfig?.examDate || defaultNeetConfig.examDate,
        targetDateLabel: config?.neetExamConfig?.targetDateLabel || defaultNeetConfig.targetDateLabel,
        isTentative: config?.neetExamConfig?.isTentative ?? defaultNeetConfig.isTentative,
        startDate: config?.neetExamConfig?.startDate || defaultNeetConfig.startDate,
        subtitle: config?.neetExamConfig?.subtitle || defaultNeetConfig.subtitle,
        daysLabel: config?.neetExamConfig?.daysLabel || defaultNeetConfig.daysLabel
      }
    };
    
    return successResponse(res, 'Public system configuration retrieved successfully', publicSettings);
  } catch (error) {
    // Fail silently with default if DB not ready
    return successResponse(res, 'Public system configuration retrieved successfully', { 
      enableRollNumberLogin: true,
      enableStudentPasswordLogin: false,
      appUpdate: {
        latestVersion: "1.0.0",
        minRequiredVersion: "1.0.0",
        isMandatory: false,
        updateUrl: "https://play.google.com/store/apps/details?id=com.arkescholarsneet.online",
        updateNotes: "New version available with enhanced performance and features!"
      },
      releaseNotes: [],
      neetExamConfig: {
        examTitle: "NEET UG 2026",
        examDate: "2026-05-03T10:00:00.000Z",
        targetDateLabel: "Expected May 2026 (Tentative)",
        isTentative: true,
        startDate: "2025-06-01T00:00:00.000Z",
        subtitle: "Stay focused. Every day brings you closer to your dream medical college! 🎯",
        daysLabel: "DAYS LEFT"
      }
    });
  }
});

module.exports = router;
