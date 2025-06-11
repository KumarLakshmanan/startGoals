import Settings from "../model/settings.js";

// Get all settings or filter by key
export const getSettings = async (req, res) => {
  try {
    const { key } = req.query;
    
    let whereClause = { isActive: true };
    if (key) {
      whereClause.key = key;
    }

    const settings = await Settings.findAll({
      where: whereClause,
      attributes: ['id', 'key', 'value', 'description', 'dataType'],
      order: [['key', 'ASC']]
    });

    // If specific key requested, return single object
    if (key && settings.length === 1) {
      return res.json({
        success: true,
        message: "Setting retrieved successfully",
        data: settings[0]
      });
    }

    res.json({
      success: true,
      message: "Settings retrieved successfully",
      data: settings
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Create or update a setting
export const upsertSetting = async (req, res) => {
  try {
    const { key, value, description, dataType = "string" } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Setting key is required"
      });
    }

    // Check if setting exists
    const existingSetting = await Settings.findOne({ where: { key } });

    let setting;
    if (existingSetting) {
      // Update existing setting
      await existingSetting.update({
        value,
        description,
        dataType
      });
      setting = existingSetting;
    } else {
      // Create new setting
      setting = await Settings.create({
        key,
        value,
        description,
        dataType
      });
    }

    res.json({
      success: true,
      message: existingSetting ? "Setting updated successfully" : "Setting created successfully",
      data: setting
    });
  } catch (error) {
    console.error("Upsert setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Delete a setting
export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await Settings.findByPk(id);
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found"
      });
    }

    await setting.update({ isActive: false });

    res.json({
      success: true,
      message: "Setting deleted successfully"
    });
  } catch (error) {
    console.error("Delete setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Bulk insert default settings
export const initializeDefaultSettings = async (req, res) => {
  try {
    const defaultSettings = [
      {
        key: "contact_phone",
        value: "1234567890",
        description: "Contact phone number for customer support",
        dataType: "string"
      },
      {
        key: "contact_email",
        value: "support@example.com",
        description: "Contact email for customer support",
        dataType: "string"
      },
      {
        key: "company_name",
        value: "StartGoals",
        description: "Company name",
        dataType: "string"
      },
      {
        key: "app_version",
        value: "1.0.0",
        description: "Current app version",
        dataType: "string"
      },
      {
        key: "maintenance_mode",
        value: "false",
        description: "Enable/disable maintenance mode",
        dataType: "boolean"
      }
    ];

    const createdSettings = [];
    
    for (const settingData of defaultSettings) {
      const existingSetting = await Settings.findOne({ 
        where: { key: settingData.key } 
      });
      
      if (!existingSetting) {
        const setting = await Settings.create(settingData);
        createdSettings.push(setting);
      }
    }

    res.json({
      success: true,
      message: `Initialized ${createdSettings.length} default settings`,
      data: createdSettings
    });
  } catch (error) {
    console.error("Initialize settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};
