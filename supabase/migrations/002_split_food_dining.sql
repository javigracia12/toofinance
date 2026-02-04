-- Split "Food & Dining" into separate "Food" and "Dining" categories for existing users.
-- 1. Normalise existing "food" category label to "Food" and set color.
UPDATE categories
SET label = 'Food', color = '#f97316'
WHERE id = 'food' AND label = 'Food & Dining';

-- 2. Add "Dining" category for every user who has "food" and does not yet have "dining".
INSERT INTO categories (id, user_id, label, color, is_custom, created_at)
SELECT 'dining', user_id, 'Dining', '#ea580c', false, now()
FROM categories
WHERE id = 'food'
AND NOT EXISTS (
  SELECT 1 FROM categories c2
  WHERE c2.user_id = categories.user_id AND c2.id = 'dining'
);
