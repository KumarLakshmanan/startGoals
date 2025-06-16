import { updateGoalsTable } from '../migrations/updateGoalsTable.js';

console.log('Running migration to update goals table...');

updateGoalsTable()
  .then(result => {
    if (result.success) {
      console.log('Migration completed successfully:', result.message);
      process.exit(0);
    } else {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  });
