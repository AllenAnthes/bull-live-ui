import React from 'react';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';

const DeleteConfirmationDialog = ({ tab, onClose, tableRef, baseUrl }) => {
  const onConfirm = () =>
    fetch(`${baseUrl}/jobs?type=${tab}`, { method: 'DELETE' })
      .then(tableRef.current.onQueryChange)
      .then(onClose);

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>Delete Jobs</DialogTitle>

      <DialogContent>
        Are you sure you want to delete all {tab} jobs? This cannot be undone.
      </DialogContent>
      <DialogActions>
        <Button autoFocus variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="secondary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
