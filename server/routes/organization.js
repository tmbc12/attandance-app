const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { auth } = require('../middleware/auth');
const { rescheduleOrg } = require('../utils/scheduler');

// Get organization settings
router.get('/settings', auth, async (req, res) => {
  try {
    // req.user is already the organization document
    const organization = req.user;

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({
      workingHours: organization.settings.workingHours,
      workingDays: organization.settings.workingDays,
      timezone: organization.settings.timezone,
      lateCheckInBuffer: organization.settings.lateCheckInBuffer || 60,
      attendanceCloseEnabled: organization.settings.attendanceCloseEnabled || false,
      attendanceCloseTime: organization.settings.attendanceCloseTime || '10:00',
      autoCheckInWindow: organization.settings.autoCheckInWindow || 90,
      companyLocation: organization.settings.companyLocation || { enabled: false },
      companyWifi: organization.settings.companyWifi || { enabled: false, networks: [] }
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

// Update organization settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { 
      workingHours, 
      workingDays, 
      timezone, 
      lateCheckInBuffer, 
      attendanceCloseEnabled, 
      attendanceCloseTime, 
      autoCheckInWindow,
      companyLocation,
      companyWifi
    } = req.body;

    // Fetch the organization from database to update it
    const organization = await Organization.findById(req.user._id);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    let prevStartTime = organization.settings.workingHours.start;
    // Validate working hours
    if (workingHours) {
      if (!workingHours.start || !workingHours.end) {
        return res.status(400).json({ message: 'Both start and end times are required' });
      }
      organization.settings.workingHours = workingHours;
    }

    // Validate working days
    if (workingDays) {
      if (!Array.isArray(workingDays) || workingDays.length === 0) {
        return res.status(400).json({ message: 'At least one working day must be selected' });
      }
      organization.settings.workingDays = workingDays;
    }

    if (timezone) organization.settings.timezone = timezone;
    if (lateCheckInBuffer !== undefined) organization.settings.lateCheckInBuffer = lateCheckInBuffer;
    if (attendanceCloseEnabled !== undefined) organization.settings.attendanceCloseEnabled = attendanceCloseEnabled;
    if (attendanceCloseTime) organization.settings.attendanceCloseTime = attendanceCloseTime;
    if (autoCheckInWindow !== undefined) organization.settings.autoCheckInWindow = autoCheckInWindow;

    // Handle company location settings
    if (companyLocation) {
      // Validate coordinates if enabling
      if (companyLocation.enabled && (!companyLocation.latitude || !companyLocation.longitude)) {
        return res.status(400).json({ message: 'Latitude and longitude are required when enabling GPS mode' });
      }
      
      organization.settings.companyLocation = {
        enabled: companyLocation.enabled || false,
        latitude: companyLocation.latitude || organization.settings.companyLocation?.latitude,
        longitude: companyLocation.longitude || organization.settings.companyLocation?.longitude,
        radius: companyLocation.radius || organization.settings.companyLocation?.radius || 200,
        address: companyLocation.address || organization.settings.companyLocation?.address
      };
    }

    // Handle company WiFi settings
    if (companyWifi) {
      // Validate networks if enabling
      if (companyWifi.enabled && (!companyWifi.networks || companyWifi.networks.length === 0)) {
        return res.status(400).json({ message: 'At least one WiFi network is required when enabling WiFi mode' });
      }
      
      organization.settings.companyWifi = {
        enabled: companyWifi.enabled || false,
        networks: companyWifi.networks || []
      };
    }

    await organization.save();

    if (prevStartTime !== organization.settings.workingHours.start) {
    // Immediately update in-process scheduler
      await rescheduleOrg(organization);
    }

    res.json({
      message: 'Settings updated successfully',
      settings: organization.settings
    });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

// Update company location settings
router.put('/settings/location', auth, async (req, res) => {
  try {
    const { enabled, latitude, longitude, radius, address } = req.body;

    const organization = await Organization.findById(req.user._id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Validate coordinates if enabling
    if (enabled && (!latitude || !longitude)) {
      return res.status(400).json({ message: 'Latitude and longitude are required when enabling GPS mode' });
    }

    organization.settings.companyLocation = {
      enabled: enabled || false,
      latitude: latitude || organization.settings.companyLocation?.latitude,
      longitude: longitude || organization.settings.companyLocation?.longitude,
      radius: radius || organization.settings.companyLocation?.radius || 200,
      address: address || organization.settings.companyLocation?.address
    };

    await organization.save();

    res.json({
      message: 'Company location updated successfully',
      companyLocation: organization.settings.companyLocation
    });
  } catch (error) {
    console.error('Error updating company location:', error);
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
});

// Update company WiFi settings
router.put('/settings/wifi', auth, async (req, res) => {
  try {
    const { enabled, networks } = req.body;

    const organization = await Organization.findById(req.user._id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Validate networks if enabling
    if (enabled && (!networks || networks.length === 0)) {
      return res.status(400).json({ message: 'At least one WiFi network is required when enabling WiFi mode' });
    }

    organization.settings.companyWifi = {
      enabled: enabled || false,
      networks: networks || []
    };

    await organization.save();

    res.json({
      message: 'Company WiFi updated successfully',
      companyWifi: organization.settings.companyWifi
    });
  } catch (error) {
    console.error('Error updating company WiFi:', error);
    res.status(500).json({ message: 'Error updating WiFi', error: error.message });
  }
});

module.exports = router;
