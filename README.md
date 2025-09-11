## Todos

### UI Enhancements

- [ ] Create dropdown menu on every file and folder entry
- [ ] Fix alignment issues with size, date, and time columns in Entry component

### File Management

- [ ] Implement delete functionality via dropdown action using @deleteFilesOrFolders in convex/drive.ts
- [ ] Implement rename functionality via dropdown action: make the name turn into an input box
- [ ] Create "Create folder" functionality

### R2 Storage Integration

- [ ] Investigate R2 file storage and current delete implementation in convex/drive.ts
- [ ] Create internal action for deleting files from R2 storage
- [ ] Modify delete mutation to call the internal action for R2 file deletion
- [ ] Test the integrated delete functionality with R2 file removal
