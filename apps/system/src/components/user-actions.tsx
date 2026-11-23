import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { Button } from "@dg/ui-coss/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@dg/ui-coss/components/dialog";
import { Input } from "@dg/ui-coss/components/input";
import { Label } from "@dg/ui-coss/components/label";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@dg/ui-coss/components/menu";
import { toastManager } from "@dg/ui-coss/components/toast";
import {
  DeleteIcon,
  GavelIcon,
  LockKeyholeIcon,
  MoreVerticalIcon,
  User2Icon,
} from "lucide-react";
import type { Dispatch } from "react";
import { useId, useState } from "react";

import { authClient } from "@/lib/auth-client";

type UserActionsUser = {
  id: string;
  name?: string | null;
  banned?: boolean | null;
};

export function UserActionsMenu({
  user,
  onDeleted,
  inline = false,
}: {
  user: UserActionsUser;
  onDeleted?: () => void;
  inline?: boolean;
}) {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const banOrUnbanUser = useConvexMutation(api.admin.users.banOrUnbanUser);
  const deleteUser = useConvexMutation(api.admin.users.deleteUser);

  async function banHandler() {
    const isBanned = user.banned ?? false;
    try {
      await banOrUnbanUser({ userId: user.id, isBanned });
      toastManager.add({
        title: isBanned ? "User unbanned" : "User banned",
        type: "success",
      });
    } catch (e: unknown) {
      const error = e as { message?: string };
      toastManager.add({
        title: error?.message || "Failed to update user",
        type: "error",
      });
    }
  }

  async function impersonateHandler() {
    const { error } = await authClient.admin.impersonateUser({
      userId: user.id,
    });
    if (error) {
      toastManager.add({ title: error.message, type: "error" });
    } else {
      window.location.reload();
    }
  }

  async function deleteHandler() {
    try {
      await deleteUser({ id: user.id });
      toastManager.add({ title: "User deleted", type: "success" });
      onDeleted?.();
    } catch (e: unknown) {
      const error = e as { message?: string };
      toastManager.add({
        title: error?.message || "Failed to delete user",
        type: "error",
      });
    }
  }

  const actions = [
    {
      label: user.banned ? "Unban User" : "Ban User",
      icon: GavelIcon,
      onClick: banHandler,
      destructive: false,
    },
    {
      label: "Impersonate User",
      icon: User2Icon,
      onClick: impersonateHandler,
      destructive: false,
    },
    {
      label: "Change Password",
      icon: LockKeyholeIcon,
      onClick: () => setIsPasswordDialogOpen(true),
      destructive: false,
    },
    {
      label: "Delete User",
      icon: DeleteIcon,
      onClick: deleteHandler,
      destructive: true,
    },
  ];

  const menu = (
    <Menu>
      <MenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="User actions" />}
      >
        <MoreVerticalIcon className="size-4" />
      </MenuTrigger>
      <MenuPopup align="end" className="w-max">
        {actions.map(({ label, icon: Icon, onClick, destructive }) => (
          <MenuItem
            key={label}
            variant={destructive ? "destructive" : undefined}
            onClick={onClick}
          >
            <Icon /> {label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );

  return (
    <>
      {inline ? (
        <>
          <div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
            {actions.map(({ label, icon: Icon, onClick, destructive }) => (
              <Button
                key={label}
                variant={destructive ? "destructive-outline" : "outline"}
                onClick={onClick}
              >
                <Icon /> {label}
              </Button>
            ))}
          </div>
          <div className="lg:hidden">{menu}</div>
        </>
      ) : (
        menu
      )}
      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        setOpen={setIsPasswordDialogOpen}
        user={user}
      />
    </>
  );
}

function ChangePasswordDialog({
  open,
  setOpen,
  user,
}: {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  user: { name?: string | null; id: string };
}) {
  const [password, setPassword] = useState("");
  const passwordInputId = useId();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPassword("");
  };

  const changePassword = async () => {
    const { error } = await authClient.admin.setUserPassword({
      userId: user.id,
      newPassword: password,
    });
    if (error) throw new Error(error.message);
    handleOpenChange(false);
  };

  const handleApply = () => {
    if (password.length < 8) {
      return toastManager.add({
        title: "Password must be at least 8 characters long",
        type: "error",
      });
    }
    const toastId = toastManager.add({
      title: `Changing password for ${user.name || user.id}`,
      type: "loading",
      timeout: 0,
    });
    void changePassword().then(
      () => {
        toastManager.add({
          title: "Password changed successfully!",
          type: "success",
          id: toastId,
        });
      },
      (error: unknown) => {
        toastManager.add({
          title: error instanceof Error ? error.message : "Error changing password!",
          type: "error",
          id: toastId,
        });
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your new password below.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApply();
          }}
          className="contents"
        >
          <DialogPanel>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={passwordInputId} className="text-right">
                  New Password
                </Label>
                <Input
                  id={passwordInputId}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter new password"
                />
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={password.length < 8}>
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
