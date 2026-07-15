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
import { useAuth } from "../../auth/AuthProvider";

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
  const { user } = useAuth();
  const normalizedProfile = normalizeTitleCaseFields(profile, TITLE_CASE_FIELDS);
  const initialRelationType = normalizedProfile?.relation_type || "mother";

  const { register, handleSubmit, control, reset, formState: { errors, isValid, isSubmitted } } = useForm({
    mode: 'onBlur',
    defaultValues: {
      name: normalizedProfile?.name || "",
      phone: normalizedProfile?.phone || "",
      email: normalizedProfile?.email || "",
      relation_type: initialRelationType,
      dob: normalizedProfile?.dob || "",
      gender: normalizedProfile?.gender || "",
      blood_group: normalizedProfile?.blood_group || "",
      father_name: normalizedProfile?.father_name || "",
      mother_name: normalizedProfile?.mother_name || "",
      guardian_name: normalizedProfile?.guardian_name || "",
      father_occupation: normalizedProfile?.father_occupation || "",
      mother_occupation: normalizedProfile?.mother_occupation || "",
      address: normalizedProfile?.address || "",
      designation: normalizedProfile?.designation || "",
      qualification: normalizedProfile?.qualification || "",
      experience: normalizedProfile?.experience || "",
    },
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [childMenuAnchor, setChildMenuAnchor] = useState(null);
  const [imageError, setImageError] = useState(null);

  useEffect(() => {
    const norm = normalizeTitleCaseFields(profile, TITLE_CASE_FIELDS);
    reset({
      name: norm?.name || "",
      phone: norm?.phone || "",
      email: norm?.email || "",
      relation_type: norm?.relation_type || "mother",
      dob: norm?.dob || "",
      gender: norm?.gender || "",
      blood_group: norm?.blood_group || "",
      father_name: norm?.father_name || "",
      mother_name: norm?.mother_name || "",
      guardian_name: norm?.guardian_name || "",
      father_occupation: norm?.father_occupation || "",
      mother_occupation: norm?.mother_occupation || "",
      address: norm?.address || "",
      designation: norm?.designation || "",
      qualification: norm?.qualification || "",
      experience: norm?.experience || "",
    });
  }, [profile, reset]);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImageError(null);
    if (onClearError) onClearError();

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError("Only JPG, JPEG, PNG, and WEBP files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageError("Profile image must not exceed 2 MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
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

  const currentAvatarUrl = previewUrl || user?.avatar_url;
  const hasAvatar = Boolean(currentAvatarUrl);

  async function handleFormSubmit(data) {
    if (onClearError) onClearError();
    const submitHandler = onSubmit || onSave;
    if (submitHandler) {
      // Trim string fields automatically
      Object.keys(data).forEach(key => {
        if (typeof data[key] === "string") {
          data[key] = data[key].replace(/\s{2,}/g, " ").trim();
        }
      });
      let normalized = normalizeTitleCaseFields(data, TITLE_CASE_FIELDS);
      await submitHandler(normalized);
    }
  }

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

        {imageError && (
          <Typography color="error" variant="caption">
            {imageError}
          </Typography>
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
          inputProps={{ style: { textTransform: "capitalize" } }}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          {...register("name", {
            required: "Name is required.",
            minLength: {
              value: 3,
              message: "Name must be at least 3 characters long."
            },
            maxLength: {
              value: 50,
              message: "Name cannot exceed 50 characters."
            },
            validate: {
              noLeadingTrailingSpaces: (v) => !v || v.trim() === v || "Name cannot start or end with spaces.",
              noConsecutiveSpaces: (v) => !v || !/\s{2,}/.test(v) || "Name cannot contain consecutive spaces.",
              validChars: (v) => !v || /^[A-Za-z\s]+$/.test(v) || "Name can contain only letters and spaces."
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
            required: "Phone number is required.",
            pattern: {
              value: /^\d{10}$/,
              message: "Please enter a valid 10-digit mobile number."
            },
            validate: {
              firstDigit: (v) => !v || /^[6789]/.test(v) || "Phone number must start with 6, 7, 8, or 9."
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
              inputProps={{ ...register("relation_type") }}
            >
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian</option>
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
                disabled
              />
              <TextField
                label="Admission No"
                fullWidth
                value={profile?.student?.admission_no || "—"}
                InputProps={{ readOnly: true }}
                disabled
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Class"
                fullWidth
                value={profile?.class?.class_name || profile?.student?.Class?.class_name || profile?.student?.class?.class_name || "—"}
                InputProps={{ readOnly: true }}
                disabled
              />
              <TextField
                label="Section"
                fullWidth
                value={profile?.section?.name || profile?.student?.Section?.name || profile?.student?.section?.name || "—"}
                InputProps={{ readOnly: true }}
                disabled
              />
            </Stack>
          </>
        )}

        {/* Student Fields */}
        {profile?.role === 'student' && (
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
                value={profile?.class?.class_name || "—"}
              />
              <TextField
                label="Section"
                fullWidth
                value={profile?.section?.name || "—"}
              />
            </Stack>
            <TextField
              label="Email"
              fullWidth
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register("email", {
                required: "Email address is required.",
                maxLength: {
                  value: 100,
                  message: "Email address cannot exceed 100 characters."
                },
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Please enter a valid email address."
                }
              })}
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
                    size="medium"
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
              <TextField label="Father's Name" fullWidth inputProps={{ style: { textTransform: "capitalize" } }} {...register("father_name")} />
              <TextField label="Mother's Name" fullWidth inputProps={{ style: { textTransform: "capitalize" } }} {...register("mother_name")} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField label="Father's Occupation" fullWidth inputProps={{ style: { textTransform: "capitalize" } }} {...register("father_occupation")} />
              <TextField label="Mother's Occupation" fullWidth inputProps={{ style: { textTransform: "capitalize" } }} {...register("mother_occupation")} />
            </Stack>
            <TextField label="Guardian Name" fullWidth inputProps={{ style: { textTransform: "capitalize" } }} {...register("guardian_name")} />
 
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
                error={Boolean(errors.gender)}
                helperText={errors.gender?.message}
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
                inputProps={{ style: { textTransform: "capitalize" } }}
                error={Boolean(errors.designation)}
                helperText={errors.designation?.message}
                {...register("designation")}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="Qualification"
                fullWidth
                error={Boolean(errors.qualification)}
                helperText={errors.qualification?.message}
                {...register("qualification", {
                  minLength: {
                    value: 2,
                    message: "Qualification must be between 2 and 100 characters."
                  },
                  maxLength: {
                    value: 100,
                    message: "Qualification must be between 2 and 100 characters."
                  },
                  validate: {
                    noLeadingTrailingSpaces: (v) => !v || v.trim() === v || "Qualification cannot start or end with spaces.",
                    validChars: (v) => !v || /^[a-zA-Z\s,.\-()]+$/.test(v) || "Qualification must contain only letters, spaces, commas, periods, hyphens, and parentheses."
                  }
                })}
              />
              <TextField
                label="Experience (Years)"
                type="number"
                fullWidth
                error={Boolean(errors.experience)}
                helperText={errors.experience?.message}
                {...register("experience", {
                  valueAsNumber: true,
                  min: { value: 0, message: "Experience must be between 0 and 50 years." },
                  max: { value: 50, message: "Experience must be between 0 and 50 years." },
                  validate: {
                    validNumber: (v) => !v || !isNaN(v) || "Experience must be a valid number.",
                    decimal: (v) => !v || /^\d+(\.\d)?$/.test(v.toString()) || "Experience can contain up to one decimal place."
                  }
                })}
              />
            </Stack>
            <TextField
              label="Email"
              fullWidth
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register("email", {
                maxLength: {
                  value: 100,
                  message: "Email address cannot exceed 100 characters."
                },
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Please enter a valid email address."
                }
              })}
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
