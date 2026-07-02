import {
  Avatar,
  Box,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import { PhotoCamera, Delete, CloudUpload, SwapHoriz } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { createImagePreview, revokeImagePreview } from "../../utils/imageUtils";
import DatePickerField from "../../components/DatePickerField";
import { normalizeTitleCaseFields } from "../../utils/textFormat";
import { useParentChild } from "../parents/ParentChildContext";

const TITLE_CASE_FIELDS = [
  "name",
  "father_name",
  "mother_name",
  "guardian_name",
  "father_occupation",
  "mother_occupation",
  "designation",
];

export default function ProfileForm({
  profile,
  onSave,
  onSubmit,
  onAvatarUpload,
  onAvatarDelete,
  saving,
  uploading,
  error,
  onClearError,
  isCompleting = false,
}) {
  const { children, selectedChild, setSelectedChildId } = useParentChild();
  const initialRelationType =
    isCompleting && profile?.role === "parent" && profile?.relation_type === "guardian"
      ? "parent"
      : profile?.relation_type || "parent";

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: profile?.name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      relation_type: initialRelationType,
      dob: profile?.dob || "",
      gender: profile?.gender || "",
      blood_group: profile?.blood_group || "",
      father_name: profile?.father_name || "",
      mother_name: profile?.mother_name || "",
      guardian_name: profile?.guardian_name || "",
      father_occupation: profile?.father_occupation || "",
      mother_occupation: profile?.mother_occupation || "",
      family_income: profile?.family_income || "",
      address: profile?.address || "",
      designation: profile?.designation || "",
      qualification: profile?.qualification || "",
      experience: profile?.experience || "",
    },
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [childMenuAnchor, setChildMenuAnchor] = useState(null);

  useEffect(() => {
    reset({
      name: profile?.name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      relation_type: initialRelationType,
      dob: profile?.dob || "",
      gender: profile?.gender || "",
      blood_group: profile?.blood_group || "",
      father_name: profile?.father_name || "",
      mother_name: profile?.mother_name || "",
      guardian_name: profile?.guardian_name || "",
      father_occupation: profile?.father_occupation || "",
      mother_occupation: profile?.mother_occupation || "",
      family_income: profile?.family_income || "",
      address: profile?.address || "",
      designation: profile?.designation || "",
      qualification: profile?.qualification || "",
      experience: profile?.experience || "",
    });
  }, [profile, reset]);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Clear any previous errors
      if (onClearError) onClearError();

      // Create preview
      const preview = createImagePreview(file);
      setPreviewUrl(preview);

      // Upload the file
      const url = await onAvatarUpload(file);

      // Update profile with new avatar URL
      await onSave({ avatar_url: url });

      // Clean up preview
      revokeImagePreview(preview);
      setPreviewUrl(null);
    } catch (uploadError) {
      // Clean up preview on error
      if (previewUrl) {
        revokeImagePreview(previewUrl);
        setPreviewUrl(null);
      }
      console.error("Avatar upload failed:", uploadError);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleAvatarDelete() {
    try {
      if (onClearError) onClearError();

      if (onAvatarDelete) {
        await onAvatarDelete();
      } else {
        // Fallback: just clear the avatar URL
        await onSave({ avatar_url: "" });
      }
    } catch (deleteError) {
      console.error("Avatar delete failed:", deleteError);
    }
  }

  async function handleFormSubmit(data) {
    if (onClearError) onClearError();
    const submitHandler = onSubmit || onSave;
    if (submitHandler) {
      let normalized = normalizeTitleCaseFields(data, TITLE_CASE_FIELDS);
      await submitHandler(normalized);
    }
  }

  const currentAvatarUrl = previewUrl || profile?.avatar_url;
  const hasAvatar = Boolean(currentAvatarUrl);
  const canSwitchChildren = profile?.role === "parent" && children.length > 1;

  function handleAvatarClick(event) {
    if (!canSwitchChildren) return;
    setChildMenuAnchor(event.currentTarget);
  }

  function handleChildSelect(childId) {
    setSelectedChildId(Number(childId));
    setChildMenuAnchor(null);
  }

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack spacing={3} alignItems="center">
        {/* Error Display */}
        {error && (
          <Alert
            severity="error"
            onClose={onClearError}
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        )}

        {/* Avatar Section */}
        <Box position="relative">
          <Avatar
            src={currentAvatarUrl}
            onClick={handleAvatarClick}
            sx={{
              width: 120,
              height: 120,
              border: 2,
              borderColor: 'primary.main',
              borderStyle: uploading ? 'dashed' : 'solid',
              cursor: canSwitchChildren ? 'pointer' : 'default',
            }}
          >
            {uploading && (
              <CircularProgress
                size={100}
                sx={{
                  position: 'absolute',
                  color: 'primary.main'
                }}
              />
            )}
          </Avatar>

          {canSwitchChildren && (
            <IconButton
              size="small"
              onClick={handleAvatarClick}
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
              }}
              aria-label="Switch linked student"
            >
              <SwapHoriz fontSize="small" />
            </IconButton>
          )}

          {uploading && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{ transform: 'translate(-50%, -50%)' }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        {canSwitchChildren && (
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
              {selectedChild?.name || "Linked Student"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tap profile image to switch student
            </Typography>
          </Stack>
        )}

        {/* Upload Controls */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            component="label"
            variant="outlined"
            startIcon={<PhotoCamera />}
            disabled={uploading || saving}
            size="small"
          >
            {hasAvatar ? 'Change Photo' : 'Add Photo'}
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleAvatarChange}
            />
          </Button>

          {hasAvatar && (
            <IconButton
              onClick={handleAvatarDelete}
              disabled={uploading || saving}
              color="error"
              size="small"
            >
              <Delete />
            </IconButton>
          )}
        </Stack>

        <Menu
          anchorEl={childMenuAnchor}
          open={Boolean(childMenuAnchor)}
          onClose={() => setChildMenuAnchor(null)}
        >
          {children.map((child) => (
            <MenuItem key={child.id} onClick={() => handleChildSelect(child.id)}>
              {child.name}{child.className ? ` - ${child.className}` : ""}{child.sectionName ? ` ${child.sectionName}` : ""}
            </MenuItem>
          ))}
        </Menu>

        {/* Upload Info removed (Chip dependency not used elsewhere) */}

        {/* Form Fields */}
        <TextField
          label="Name"
          fullWidth
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          {...register("name", {
            required: "Name is required",
            minLength: {
              value: 2,
              message: "Name must be at least 2 characters"
            },
            maxLength: {
              value: 50,
              message: "Name cannot exceed 50 characters"
            }
          })}
        />

        <TextField
          label="Phone"
          fullWidth
          error={Boolean(errors.phone)}
          helperText={
            errors.phone?.message ||
            (profile?.role === "student"
              ? "Student and linked parent can use the same phone number. Other duplicate numbers will show an error when you save."
              : "")
          }
          {...register("phone", {
            required: "Phone number is required",
            pattern: {
              value: /^\d{10}$/,
              message: "Please enter a valid 10-digit phone number"
            }
          })}
          onInput={(e) => {
            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
          }}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
            maxLength: 10,
          }}
        />

        {/* Parent Fields */}
        {profile?.role === 'parent' && (
          <>
            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Parent Details
            </Typography>
            <TextField
              label="Email"
              fullWidth
              type="email"
              {...register("email")}
            />
            <TextField
              label="Relation Type"
              fullWidth
              select
              defaultValue={initialRelationType}
              SelectProps={{ native: true }}
              {...register("relation_type")}
            >
              <option value="guardian">Guardian</option>
              <option value="parent">Parent</option>
            </TextField>
            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Linked Student
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Student Name"
                fullWidth
                value={profile?.student?.User?.name || profile?.student?.user?.name || profile?.student?.name || "—"}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Admission No"
                fullWidth
                value={profile?.student?.admission_no || "—"}
                InputProps={{ readOnly: true }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Class"
                fullWidth
                value={profile?.class?.class_name || profile?.student?.Class?.class_name || profile?.student?.class?.class_name || "—"}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Section"
                fullWidth
                value={profile?.section?.name || profile?.student?.Section?.name || profile?.student?.section?.name || "—"}
                InputProps={{ readOnly: true }}
              />
            </Stack>
          </>
        )}

        {/* Student Fields */}
        {profile?.role === 'student' && (
          <>
            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Personal Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Class"
                fullWidth
                value={profile?.class?.class_name || "—"}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Section"
                fullWidth
                value={profile?.section?.name || "—"}
                InputProps={{ readOnly: true }}
              />
            </Stack>
            <TextField
              label="Email"
              fullWidth
              type="email"
              {...register("email")}
              sx={{ mb: 2 }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <Controller
                name="dob"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    label="Date of Birth"
                    value={field.value}
                    onChange={field.onChange}
                    disableFuture
                  />
                )}
              />
              <TextField
                select
                fullWidth
                defaultValue={profile?.gender || ""}
                SelectProps={{ native: true, displayEmpty: true }}
                inputProps={{ "aria-label": "Gender" }}
                {...register("gender")}
              >
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </TextField>
              <TextField
                label="Blood Group"
                fullWidth
                {...register("blood_group")}
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Family Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField label="Father's Name" fullWidth {...register("father_name")} />
              <TextField label="Mother's Name" fullWidth {...register("mother_name")} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField label="Father's Occupation" fullWidth {...register("father_occupation")} />
              <TextField label="Mother's Occupation" fullWidth {...register("mother_occupation")} />
            </Stack>
            <TextField label="Guardian Name" fullWidth {...register("guardian_name")} />
            <TextField label="Family Income" type="number" fullWidth {...register("family_income")} />

            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Address
            </Typography>
            <TextField
              label="Address"
              multiline
              rows={3}
              fullWidth
              {...register("address")}
            />
          </>
        )}

        {/* Teacher Fields */}
        {profile?.role === 'teacher' && (
          <>
            <Typography variant="subtitle1" sx={{ alignSelf: 'start', fontWeight: 'bold', mt: 1 }}>
              Professional Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                select
                fullWidth
                defaultValue={profile?.gender || ""}
                SelectProps={{ native: true, displayEmpty: true }}
                inputProps={{ "aria-label": "Gender" }}
                {...register("gender")}
              >
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </TextField>
              <TextField
                label="Designation"
                fullWidth
                {...register("designation")}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Qualification"
                fullWidth
                {...register("qualification")}
              />
              <TextField
                label="Experience (Years)"
                type="number"
                fullWidth
                {...register("experience")}
              />
            </Stack>
            <TextField
              label="Email"
              fullWidth
              type="email"
              {...register("email")}
            />
          </>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={saving || uploading}
          startIcon={saving ? <CircularProgress size={20} /> : <CloudUpload />}
        >
          {saving ? 'Saving...' : (isCompleting ? 'Complete Profile' : 'Save Profile')}
        </Button>

        {/* Upload Status */}
        {uploading && (
          <Typography variant="body2" color="text.secondary">
            Uploading image...
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
