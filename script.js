const API_BASE = 'http://localhost:5001/api';
const ACCESS_TOKEN_KEY = 'eduwaveAccessToken';
const REFRESH_TOKEN_KEY = 'eduwaveRefreshToken';

const getAuthHeaders = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleApiResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Unexpected API error');
  }
  return payload;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return handleApiResponse(response);
};

const saveTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const redirectAfterLogin = () => {
  window.location.href = 'courses.html';
};

const updateAuthNav = (user) => {
  const authLinks = document.querySelector('.auth-links');
  if (!authLinks) return;

  if (user && user.name) {
    authLinks.innerHTML = `
      <span class="nav-user">Hi, ${user.name}</span>
      <a href="profile.html" class="btn btn-outline">Profile</a>
      <button id="logoutButton" class="btn btn-secondary">Logout</button>
    `;
    const logoutButton = document.querySelector('#logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = 'index.html';
      });
    }
  } else {
    authLinks.innerHTML = `
      <a href="login.html" class="btn btn-outline">Login</a>
      <a href="signup.html" class="btn btn-primary">Sign Up</a>
    `;
  }
};

const fetchCurrentUser = async () => {
  try {
    const data = await fetchJson(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    return data.user;
  } catch (error) {
    return null;
  }
};

const fetchUserById = async (userId) => {
  if (!userId) return null;
  try {
    const data = await fetchJson(`${API_BASE}/users/${userId}`, { headers: getAuthHeaders() });
    return data.user;
  } catch (error) {
    return null;
  }
};

const attachAuthHandlers = () => {
  const loginForm = document.querySelector('#loginForm');
  const signupForm = document.querySelector('#signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.querySelector('#loginEmail').value.trim();
      const password = document.querySelector('#loginPassword').value.trim();

      try {
        const data = await fetchJson(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ email, password })
        });
        saveTokens(data);
        redirectAfterLogin();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = document.querySelector('#signupName').value.trim();
      const email = document.querySelector('#signupEmail').value.trim();
      const password = document.querySelector('#signupPassword').value.trim();
      const role = document.querySelector('input[name="role"]:checked')?.value || 'student';

      try {
        const data = await fetchJson(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, email, password, role })
        });
        saveTokens(data);
        redirectAfterLogin();
      } catch (error) {
        alert(error.message);
      }
    });
  }
};

const enrollCourse = async (courseId) => {
  const currentUser = await fetchCurrentUser();
  if (!currentUser) {
    window.location.href = 'signup.html';
    return;
  }

  try {
    await fetchJson(`${API_BASE}/enrollments/${courseId}/enroll`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    alert('Enrolled successfully!');
    // Optionally, update UI to show enrolled status
  } catch (error) {
    alert(error.message);
  }
};

const renderCourseCards = (courses) => {
  const courseGrid = document.querySelector('#courseGrid');
  if (!courseGrid) return;

  if (!courses || !courses.length) {
    courseGrid.innerHTML = '<div class="full-card empty-card"><p>No courses available yet.</p></div>';
    return;
  }

  courseGrid.innerHTML = courses
    .map((course) => {
      const category = course.category || 'General';
      const level = course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'All levels';
      const instructor = course.instructor_name || 'Course instructor';
      const thumbnail = course.thumbnail_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80';

      return `
        <article class="course-card course-list-card">
          <img src="${thumbnail}" alt="${course.title}" />
          <div class="card-body">
            <p class="course-meta">${category} • ${level}</p>
            <h3>${course.title}</h3>
            <p class="instructor">By ${instructor}</p>
            <div class="card-footer">
              <span>${course.duration || '––'} mins</span>
              <button onclick="enrollCourse(${course.id})" class="btn btn-sm">Enroll</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
};

const loadCourseList = async () => {
  const courseGrid = document.querySelector('#courseGrid');
  if (!courseGrid) return;

  const category = document.querySelector('#filterCategory')?.value || '';
  const level = document.querySelector('#filterLevel')?.value || '';

  courseGrid.innerHTML = '<div class="full-card empty-card"><p>Loading courses...</p></div>';

  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (level) params.append('level', level);

    const data = await fetchJson(`${API_BASE}/courses?${params.toString()}`);
    renderCourseCards(data.courses);
  } catch (error) {
    courseGrid.innerHTML = `<div class="full-card empty-card"><p>${error.message}</p></div>`;
  }
};

const setupCourseFilters = () => {
  const categorySelect = document.querySelector('#filterCategory');
  const levelSelect = document.querySelector('#filterLevel');

  [categorySelect, levelSelect].forEach((select) => {
    if (select) {
      select.addEventListener('change', loadCourseList);
    }
  });
};

const loadCourseDetail = async () => {
  const courseId = new URLSearchParams(window.location.search).get('id');
  const titleEl = document.querySelector('#courseTitle');
  const instructorEl = document.querySelector('#courseInstructor');
  const overviewEl = document.querySelector('#courseOverview');
  const lessonListEl = document.querySelector('#lessonList');
  const continueButton = document.querySelector('#continueButton');

  if (!courseId || !titleEl || !overviewEl || !lessonListEl) return;

  lessonListEl.innerHTML = '<div class="full-card empty-card"><p>Loading course details...</p></div>';

  try {
    const [courseData, lessonsData] = await Promise.all([
      fetchJson(`${API_BASE}/courses/${courseId}`),
      fetchJson(`${API_BASE}/courses/${courseId}/lessons`)
    ]);

    const course = courseData.course;
    const lessons = lessonsData.lessons || [];

    titleEl.textContent = course.title || 'Course';
    instructorEl.textContent = `By ${course.instructor_name || 'Instructor'}`;
    overviewEl.textContent = course.description || 'No overview available for this course yet.';

    const currentUser = await fetchCurrentUser();
    let isEnrolled = false;
    if (currentUser) {
      try {
        const enrollmentsData = await fetchJson(`${API_BASE}/enrollments/user/enrollments`, { headers: getAuthHeaders() });
        isEnrolled = enrollmentsData.enrollments.some(e => e.course_id === parseInt(courseId));
      } catch (e) {
        // Ignore error, assume not enrolled
      }
    }

    if (continueButton) {
      if (!currentUser) {
        continueButton.textContent = 'Sign Up to Continue';
        continueButton.href = 'signup.html';
      } else if (!isEnrolled) {
        continueButton.textContent = 'Enroll to Continue';
        continueButton.onclick = () => enrollCourse(courseId);
        continueButton.href = '#';
      } else if (lessons.length) {
        continueButton.href = `lesson-player.html?lesson=${lessons[0].id}`;
      } else {
        continueButton.classList.add('disabled');
        continueButton.textContent = 'No lessons yet';
      }
    }

    lessonListEl.innerHTML = lessons.length
      ? lessons
          .map(
            (lesson) => {
              const canAccess = currentUser && isEnrolled;
              return `
              <article class="lesson-card">
                <h3>${lesson.title}</h3>
                <p>${lesson.description || 'Lesson details will appear here.'}</p>
                <a href="${canAccess ? `lesson-player.html?lesson=${lesson.id}` : 'signup.html'}" class="btn btn-sm">${canAccess ? 'Play' : 'Sign Up to Play'}</a>
              </article>
            `;
            }
          )
          .join('')
      : '<div class="full-card empty-card"><p>No lessons available for this course.</p></div>';
  } catch (error) {
    lessonListEl.innerHTML = `<div class="full-card empty-card"><p>${error.message}</p></div>`;
  }
};

const loadProfile = async () => {
  const profileName = document.querySelector('#profileName');
  const profileRole = document.querySelector('#profileRole');
  const profileEmail = document.querySelector('#profileEmail');
  const profileEnrollments = document.querySelector('#profileEnrollments');
  const enrolledCoursesList = document.querySelector('#enrolledCoursesList');

  if (!profileName || !profileEmail || !enrolledCoursesList) return;

  if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
    profileName.textContent = 'Not signed in';
    profileRole.textContent = 'Please login to view your profile';
    profileEmail.textContent = '—';
    enrolledCoursesList.innerHTML = '<li><a href="login.html">Login to see enrolled courses</a></li>';
    if (profileEnrollments) profileEnrollments.textContent = '0';
    return;
  }

  try {
    const queryParams = new URLSearchParams(window.location.search);
    const requestedUserId = queryParams.get('userId');

    const user = requestedUserId
      ? await fetchUserById(requestedUserId)
      : (await fetchJson(`${API_BASE}/users/profile`, { headers: getAuthHeaders() })).user;

    const enrollmentsData = await fetchJson(`${API_BASE}/enrollments/user/enrollments`, { headers: getAuthHeaders() });
    const enrollments = enrollmentsData.enrollments || [];

    profileName.textContent = user.name || 'Student';
    profileRole.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student';
    profileEmail.textContent = user.email || '—';
    profileEnrollments.textContent = `${enrollments.length}`;

    enrolledCoursesList.innerHTML = enrollments.length
      ? enrollments
          .map((enrollment) => `<li><a href="course-detail.html?id=${enrollment.course_id}">${enrollment.title}</a></li>`)
          .join('')
      : '<li>No enrolled courses yet.</li>';
  } catch (error) {
    enrolledCoursesList.innerHTML = `<li>${error.message}</li>`;
    if (profileEnrollments) profileEnrollments.textContent = '0';
  }
};

const setupPage = async () => {
  attachAuthHandlers();
  const courseGrid = document.querySelector('#courseGrid');
  const courseTitle = document.querySelector('#courseTitle');
  const profileName = document.querySelector('#profileName');

  const currentUser = await fetchCurrentUser();
  updateAuthNav(currentUser);

  // Check if page requires authentication
  const protectedPages = ['radio.html', 'dashboard.html', 'profile.html', 'instructor-dashboard.html', 'audio-player.html', 'lesson-player.html'];
  const currentPage = window.location.pathname.split('/').pop();
  if (protectedPages.includes(currentPage) && !currentUser) {
    window.location.href = 'signup.html';
    return;
  }

  if (courseGrid) {
    setupCourseFilters();
    loadCourseList();
  }

  if (courseTitle) {
    loadCourseDetail();
  }

  if (profileName) {
    loadProfile();
  }

  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', function () {
      const target = this.dataset.tab;
      tabs.forEach((button) => button.classList.toggle('active', button === this));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === target));
    });
  });

  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const authLinks = document.querySelector('.auth-links');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
      if (authLinks) authLinks.classList.toggle('open');
    });
  }
};

document.addEventListener('DOMContentLoaded', setupPage);
