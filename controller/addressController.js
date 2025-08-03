import Address from "../model/address.js";
import sequelize from "../config/db.js";
import { validateMobile } from "../utils/commonUtils.js";
import {
    sendSuccess,
    sendValidationError,
    sendNotFound,
    sendServerError,
} from "../utils/responseHelper.js";

/**
 * Create a new address for the authenticated user
 */
export const createAddress = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { userId } = req.user;
        const {
            title,
            doorNo,
            street,
            landmark,
            city,
            state,
            zipCode,
            country,
            addressType,
            isDefault,
            fullName,
            phoneNumber,
            alternatePhoneNumber,
        } = req.body;
        // Validate required fields
        if (!title || !doorNo || !street || !city || !state || !zipCode || !fullName || !phoneNumber) {
            await transaction.rollback();
            return sendValidationError(res, "Required fields: title, doorNo, street, city, state, zipCode, fullName, phoneNumber");
        }

        // Validate phone numbers
        if (!validateMobile(phoneNumber)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid phone number format");
        }

        if (alternatePhoneNumber && !validateMobile(alternatePhoneNumber)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid alternate phone number format");
        }

        // Validate address type
        const validAddressTypes = ["home", "office", "other"];
        if (addressType && !validAddressTypes.includes(addressType)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid address type. Must be: home, office, or other");
        }
        // Check if user already has any addresses
        const addressCount = await Address.count({
            where: { userId },
            transaction,
        });

        let isSetDefault = false;

        if (addressCount === 0) {
            // First address for user, always set as default
            isSetDefault = true;
        } else if (isDefault) {
            // If user wants to set this as default, unset others
            await Address.update(
                { isDefault: false },
                {
                    where: { userId },
                    transaction,
                }
            );
            isSetDefault = true;
        }

        // Create the address
        const address = await Address.create(
            {
                userId,
                title,
                doorNo,
                street,
                landmark: landmark || null,
                city,
                state,
                zipCode,
                country: country || "India",
                addressType: addressType || "home",
                isDefault: isSetDefault,
                fullName,
                phoneNumber,
                alternatePhoneNumber: alternatePhoneNumber || null,
            },
            { transaction }
        );

        await transaction.commit();

        return sendSuccess(res, "Address created successfully", address);
    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        console.error("Create address error:", error);
        return sendServerError(res, error);
    }
};

/**
 * Get all addresses for the authenticated user
 */
export const getAllAddresses = async (req, res) => {
    try {
        const { userId } = req.user;

        const addresses = await Address.findAll({
            where: { userId },
            order: [["isDefault", "DESC"], ["createdAt", "DESC"]],
        });

        return sendSuccess(res, "Addresses retrieved successfully", addresses);
    } catch (error) {
        console.error("Get addresses error:", error);
        return sendServerError(res, error);
    }
};

/**
 * Get a specific address by ID
 */
export const getAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { addressId } = req.params;

        const address = await Address.findOne({
            where: {
                addressId,
                userId,
            },
        });

        if (!address) {
            return sendNotFound(res, "Address not found");
        }

        return sendSuccess(res, "Address retrieved successfully", address);
    } catch (error) {
        console.error("Get address error:", error);
        return sendServerError(res, error);
    }
};

/**
 * Update an existing address
 */
export const updateAddress = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { userId } = req.user;
        const { addressId } = req.params;
        const {
            title,
            doorNo,
            street,
            landmark,
            city,
            state,
            zipCode,
            country,
            addressType,
            isDefault,
            fullName,
            phoneNumber,
            alternatePhoneNumber,
        } = req.body;

        // Find the address
        const address = await Address.findOne({
            where: {
                addressId,
                userId,
            },
            transaction,
        });

        if (!address) {
            await transaction.rollback();
            return sendNotFound(res, "Address not found");
        }

        // Validate phone numbers if provided
        if (phoneNumber && !validateMobile(phoneNumber)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid phone number format");
        }

        if (alternatePhoneNumber && !validateMobile(alternatePhoneNumber)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid alternate phone number format");
        }

        // Validate address type if provided
        const validAddressTypes = ["home", "office", "other"];
        if (addressType && !validAddressTypes.includes(addressType)) {
            await transaction.rollback();
            return sendValidationError(res, "Invalid address type. Must be: home, office, or other");
        }

        // If this is set as default, unset other default addresses
        if (isDefault) {
            await Address.update(
                { isDefault: false },
                {
                    where: { userId, addressId: { [sequelize.Op.ne]: addressId } },
                    transaction,
                }
            );
        }

        // Build update data
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (doorNo !== undefined) updateData.doorNo = doorNo;
        if (street !== undefined) updateData.street = street;
        if (landmark !== undefined) updateData.landmark = landmark;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zipCode !== undefined) updateData.zipCode = zipCode;
        if (country !== undefined) updateData.country = country;
        if (addressType !== undefined) updateData.addressType = addressType;
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        if (fullName !== undefined) updateData.fullName = fullName;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (alternatePhoneNumber !== undefined) updateData.alternatePhoneNumber = alternatePhoneNumber;

        // Update the address
        await address.update(updateData, { transaction });

        await transaction.commit();

        // Fetch updated address
        const updatedAddress = await Address.findByPk(addressId);

        return sendSuccess(res, "Address updated successfully", updatedAddress);
    } catch (error) {
        await transaction.rollback();
        console.error("Update address error:", error);
        return sendServerError(res, error);
    }
};

/**
 * Delete an address
 */
export const deleteAddress = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { userId } = req.user;
        const { addressId } = req.params;

        const address = await Address.findOne({
            where: {
                addressId,
                userId,
            },
            transaction,
        });

        if (!address) {
            await transaction.rollback();
            return sendNotFound(res, "Address not found");
        }

        // Check if this is the only address and it's default
        const totalAddresses = await Address.count({
            where: { userId },
            transaction,
        });

        // If deleting default address and there are other addresses, set another as default
        if (address.isDefault && totalAddresses > 1) {
            const nextAddress = await Address.findOne({
                where: {
                    userId,
                    addressId: { [sequelize.Op.ne]: addressId },
                },
                order: [["createdAt", "ASC"]],
                transaction,
            });

            if (nextAddress) {
                await nextAddress.update({ isDefault: true }, { transaction });
            }
        }

        // Soft delete the address
        await address.destroy({ transaction });

        await transaction.commit();

        return sendSuccess(res, "Address deleted successfully");
    } catch (error) {
        await transaction.rollback();
        console.error("Delete address error:", error);
        return sendServerError(res, error);
    }
};

/**
 * Set an address as default
 */
export const setDefaultAddress = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { userId } = req.user;
        const { addressId } = req.params;

        const address = await Address.findOne({
            where: {
                addressId,
                userId,
            },
            transaction,
        });

        if (!address) {
            await transaction.rollback();
            return sendNotFound(res, "Address not found");
        }

        // Unset all other default addresses for this user
        await Address.update(
            { isDefault: false },
            {
                where: { userId },
                transaction,
            }
        );

        // Set this address as default
        await address.update({ isDefault: true }, { transaction });

        await transaction.commit();

        return sendSuccess(res, "Default address updated successfully", address);
    } catch (error) {
        await transaction.rollback();
        console.error("Set default address error:", error);
        return sendServerError(res, error);
    }
};
