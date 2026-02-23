import React, { useState } from "react"
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
} from "@mui/material"
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  Analytics,
  CloudQueue,
  AdminPanelSettings,
} from "@mui/icons-material"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from '../hooks/useAuth.jsx';

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState(null)

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    logout()
    navigate("/login")
  }

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Predict", path: "/predict", icon: <CloudQueue /> },
    { label: "Analytics", path: "/analytics", icon: <Analytics /> },
  ]

  if (user?.role === "admin") {
    navItems.push({ label: "Admin", path: "/admin", icon: <AdminPanelSettings /> })
  }

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Cloud Load Management
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: location.pathname === item.path ? "rgba(255,255,255,0.1)" : "transparent",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              {item.label}
            </Button>
          ))}

          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={user?.role?.toUpperCase()}
              size="small"
              color={user?.role === "admin" ? "secondary" : "default"}
              sx={{ color: "white", borderColor: "white" }}
              variant="outlined"
            />
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <AccountCircle sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
