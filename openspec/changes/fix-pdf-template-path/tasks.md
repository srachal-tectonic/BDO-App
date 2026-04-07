# Tasks: Fix PDF Template Path for Deployed Environment

## 1. Move PDF Files
- [x] 1.1 Create `/public/pdfs` directory
- [x] 1.2 Move all PDF files from `/pdfs` to `/public/pdfs`
- [x] 1.3 Remove the old `/pdfs` directory

## 2. Update Download Endpoint
- [x] 2.1 Update the path resolution to use `public/pdfs` instead of `pdfs`
- [x] 2.2 Verify the path works in both development and production

## 3. Testing
- [ ] 3.1 Verify PDFs can be downloaded in development
- [ ] 3.2 Deploy and verify PDFs can be downloaded in production
