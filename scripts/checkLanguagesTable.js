import sequelize from '../config/db.js';

const checkLanguagesTableStructure = async () => {
  try {
    const columns = await sequelize.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'languages' ORDER BY ordinal_position",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Languages Table Structure:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking table structure:', error);
    process.exit(1);
  }
};

checkLanguagesTableStructure();
