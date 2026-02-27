-- Generated images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  prompt TEXT NOT NULL,
  image_data TEXT NOT NULL,  -- base64 encoded
  mime_type TEXT DEFAULT 'image/png',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own generated images"
  ON generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at DESC);
