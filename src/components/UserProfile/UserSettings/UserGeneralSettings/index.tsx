import Badge from '@app/components/Common/Badge';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import LanguageSelector from '@app/components/LanguageSelector';
import QuotaSelector from '@app/components/QuotaSelector';
import RegionSelector from '@app/components/RegionSelector';
import type { AvailableLocale } from '@app/context/LanguageContext';
import { availableLanguages } from '@app/context/LanguageContext';
import useLocale from '@app/hooks/useLocale';
import useSettings from '@app/hooks/useSettings';
import { Permission, UserType, useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import ErrorPage from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { ApiErrorCode } from '@server/constants/error';
import type { UserSettingsGeneralResponse } from '@server/interfaces/api/userSettingsInterfaces';
import { Field, Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';
import * as Yup from 'yup';
import { movieCertifications, tvCertifications } from '@server/models/certifications';

const messages = defineMessages(
  'components.UserProfile.UserSettings.UserGeneralSettings',
  {
    general: 'General',
    generalsettings: 'General Settings',
    displayName: 'Display Name',
    email: 'Email',
    save: 'Save Changes',
    saving: 'Saving…',
    mediaServerUser: '{mediaServerName} User',
    accounttype: 'Account Type',
    plexuser: 'Plex User',
    localuser: 'Local User',
    role: 'Role',
    owner: 'Owner',
    admin: 'Admin',
    user: 'User',
    toastSettingsSuccess: 'Settings saved successfully!',
    toastSettingsFailure: 'Something went wrong while saving settings.',
    toastSettingsFailureEmail: 'This email is already taken!',
    toastSettingsFailureEmailEmpty:
      'Another user already has this username. You must set an email',
    region: 'Discover Region',
    regionTip: 'Filter content by regional availability',
    discoverRegion: 'Discover Region',
    discoverRegionTip: 'Filter content by regional availability',
    originallanguage: 'Discover Language',
    originallanguageTip: 'Filter content by original language',
    streamingRegion: 'Streaming Region',
    streamingRegionTip: 'Show streaming sites by regional availability',
    movierequestlimit: 'Movie Request Limit',
    seriesrequestlimit: 'Series Request Limit',
    enableOverride: 'Override Global Limit',
    applanguage: 'Display Language',
    languageDefault: 'Default ({language})',
    discordId: 'Discord User ID',
    discordIdTip:
      'The <FindDiscordIdLink>multi-digit ID number</FindDiscordIdLink> associated with your Discord user account',
    validationemailrequired: 'Email required',
    validationemailformat: 'Valid email required',
    validationDiscordId: 'You must provide a valid Discord user ID',
    plexwatchlistsyncmovies: 'Auto-Request Movies',
    plexwatchlistsyncmoviestip:
      'Automatically request movies on your <PlexWatchlistSupportLink>Plex Watchlist</PlexWatchlistSupportLink>',
    plexwatchlistsyncseries: 'Auto-Request Series',
    plexwatchlistsyncseriestip:
      'Automatically request series on your <PlexWatchlistSupportLink>Plex Watchlist</PlexWatchlistSupportLink>',
    certificationRestrictions: 'Content Restrictions',
    enableCertificationRestrictions: 'Enable Content Rating Restrictions',
    enableCertificationRestrictionsDescription:
      'Restrict media based on age-rating certification',
    allowedMovieCertifications: 'Allowed Movie Ratings',
    allowedMovieCertificationsDescription: 'Select which movie ratings you want to allow',
    allowedTvCertifications: 'Allowed TV Ratings',
    allowedTvCertificationsDescription: 'Select which TV ratings you want to allow',
    certificationsSelectAll: 'Select All',
    certificationsSelectNone: 'Select None',
  }
);

const UserGeneralSettings = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { locale, setLocale } = useLocale();
  const [movieQuotaEnabled, setMovieQuotaEnabled] = useState(false);
  const [tvQuotaEnabled, setTvQuotaEnabled] = useState(false);
  const router = useRouter();
  const {
    user,
    hasPermission,
    revalidate: revalidateUser,
  } = useUser({
    id: Number(router.query.userId),
  });
  const { user: currentUser, hasPermission: currentHasPermission } = useUser();
  const { currentSettings } = useSettings();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<UserSettingsGeneralResponse>(
    user ? `/api/v1/user/${user?.id}/settings/main` : null
  );

  const UserGeneralSettingsSchema = Yup.object().shape({
    email:
      // email is required for everybody except non-admin jellyfin users
      user?.id === 1 ||
      (user?.userType !== UserType.JELLYFIN && user?.userType !== UserType.EMBY)
        ? Yup.string()
            .email(intl.formatMessage(messages.validationemailformat))
            .required(intl.formatMessage(messages.validationemailrequired))
        : Yup.string().email(
            intl.formatMessage(messages.validationemailformat)
          ),
    discordId: Yup.string()
      .nullable()
      .matches(/^\d{17,19}$/, intl.formatMessage(messages.validationDiscordId)),
  });

  useEffect(() => {
    setMovieQuotaEnabled(
      data?.movieQuotaLimit != undefined && data?.movieQuotaDays != undefined
    );
    setTvQuotaEnabled(
      data?.tvQuotaLimit != undefined && data?.tvQuotaDays != undefined
    );
  }, [data]);

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <ErrorPage statusCode={500} />;
  }

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.general),
          intl.formatMessage(globalMessages.usersettings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">
          {intl.formatMessage(messages.generalsettings)}
        </h3>
      </div>
      <Formik
        initialValues={{
          displayName: data?.username !== user?.email ? data?.username : '',
          email: data?.email?.includes('@') ? data.email : '',
          discordId: data?.discordId ?? '',
          locale: data?.locale,
          discoverRegion: data?.discoverRegion,
          streamingRegion: data?.streamingRegion,
          originalLanguage: data?.originalLanguage,
          movieQuotaLimit: data?.movieQuotaLimit,
          movieQuotaDays: data?.movieQuotaDays,
          tvQuotaLimit: data?.tvQuotaLimit,
          tvQuotaDays: data?.tvQuotaDays,
          watchlistSyncMovies: data?.watchlistSyncMovies,
          watchlistSyncTv: data?.watchlistSyncTv,
          enableCertificationRestrictions: data?.enableCertificationRestrictions ?? false,
          allowedMovieCertifications: data?.allowedMovieCertifications ?? [],
          allowedTvCertifications: data?.allowedTvCertifications ?? [],
        }}
        validationSchema={UserGeneralSettingsSchema}
        enableReinitialize
        onSubmit={async (values) => {
          console.log('Submitting form values:', {
            allowedMovieCertifications: values.allowedMovieCertifications,
            allowedTvCertifications: values.allowedTvCertifications,
          });
          try {
            const res = await fetch(`/api/v1/user/${user?.id}/settings/main`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: values.displayName,
                email:
                  values.email || user?.jellyfinUsername || user?.plexUsername,
                discordId: values.discordId,
                locale: values.locale,
                discoverRegion: values.discoverRegion,
                streamingRegion: values.streamingRegion,
                originalLanguage: values.originalLanguage,
                movieQuotaLimit: movieQuotaEnabled
                  ? values.movieQuotaLimit
                  : null,
                movieQuotaDays: movieQuotaEnabled
                  ? values.movieQuotaDays
                  : null,
                tvQuotaLimit: tvQuotaEnabled ? values.tvQuotaLimit : null,
                tvQuotaDays: tvQuotaEnabled ? values.tvQuotaDays : null,
                watchlistSyncMovies: values.watchlistSyncMovies,
                watchlistSyncTv: values.watchlistSyncTv,
                enableCertificationRestrictions: values.enableCertificationRestrictions,
                allowedMovieCertifications: values.enableCertificationRestrictions
                  ? values.allowedMovieCertifications
                  : [],
                allowedTvCertifications: values.enableCertificationRestrictions
                  ? values.allowedTvCertifications
                  : [],
              }),
            });
            if (!res.ok) throw new Error(res.statusText, { cause: res });

            if (currentUser?.id === user?.id && setLocale) {
              setLocale(
                (values.locale
                  ? values.locale
                  : currentSettings.locale) as AvailableLocale
              );
            }

            addToast(intl.formatMessage(messages.toastSettingsSuccess), {
              autoDismiss: true,
              appearance: 'success',
            });
          } catch (e) {
            let errorData;
            try {
              errorData = await e.cause?.text();
              errorData = JSON.parse(errorData);
            } catch {
              /* empty */
            }
            if (errorData?.message === ApiErrorCode.InvalidEmail) {
              if (values.email) {
                addToast(
                  intl.formatMessage(messages.toastSettingsFailureEmail),
                  {
                    autoDismiss: true,
                    appearance: 'error',
                  }
                );
              } else {
                addToast(
                  intl.formatMessage(messages.toastSettingsFailureEmailEmpty),
                  {
                    autoDismiss: true,
                    appearance: 'error',
                  }
                );
              }
            } else {
              addToast(intl.formatMessage(messages.toastSettingsFailure), {
                autoDismiss: true,
                appearance: 'error',
              });
            }
          } finally {
            revalidate();
            revalidateUser();
          }
        }}
      >
        {({
          errors,
          touched,
          isSubmitting,
          isValid,
          values,
          setFieldValue,
        }) => {
          return (
            <Form className="section">
              <div className="form-row">
                <label className="text-label">
                  {intl.formatMessage(messages.accounttype)}
                </label>
                <div className="mb-1 text-sm font-medium leading-5 text-gray-400 sm:mt-2">
                  <div className="flex max-w-lg items-center">
                    {user?.userType === UserType.PLEX ? (
                      <Badge badgeType="warning">
                        {intl.formatMessage(messages.plexuser)}
                      </Badge>
                    ) : user?.userType === UserType.LOCAL ? (
                      <Badge badgeType="default">
                        {intl.formatMessage(messages.localuser)}
                      </Badge>
                    ) : user?.userType === UserType.EMBY ? (
                      <Badge badgeType="success">
                        {intl.formatMessage(messages.mediaServerUser, {
                          mediaServerName: 'Emby',
                        })}
                      </Badge>
                    ) : user?.userType === UserType.JELLYFIN ? (
                      <Badge badgeType="default">
                        {intl.formatMessage(messages.mediaServerUser, {
                          mediaServerName: 'Jellyfin',
                        })}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label className="text-label">
                  {intl.formatMessage(messages.role)}
                </label>
                <div className="mb-1 text-sm font-medium leading-5 text-gray-400 sm:mt-2">
                  <div className="flex max-w-lg items-center">
                    {user?.id === 1
                      ? intl.formatMessage(messages.owner)
                      : hasPermission(Permission.ADMIN)
                      ? intl.formatMessage(messages.admin)
                      : intl.formatMessage(messages.user)}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="displayName" className="text-label">
                  {intl.formatMessage(messages.displayName)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field
                      id="displayName"
                      name="displayName"
                      type="text"
                      placeholder={
                        user?.jellyfinUsername ||
                        user?.plexUsername ||
                        user?.email
                      }
                    />
                  </div>
                  {errors.displayName &&
                    touched.displayName &&
                    typeof errors.displayName === 'string' && (
                      <div className="error">{errors.displayName}</div>
                    )}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="email" className="text-label">
                  {intl.formatMessage(messages.email)}
                  {user?.warnings.find((w) => w === 'userEmailRequired') && (
                    <span className="label-required">*</span>
                  )}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field
                      id="email"
                      name="email"
                      type="text"
                      placeholder="example@domain.com"
                      disabled={user?.plexUsername}
                      className={
                        user?.warnings.find((w) => w === 'userEmailRequired')
                          ? 'border-2 border-red-400 focus:border-blue-600'
                          : ''
                      }
                    />
                  </div>
                  {errors.email && touched.email && (
                    <div className="error">{errors.email}</div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="discordId" className="text-label">
                  {intl.formatMessage(messages.discordId)}
                  {currentUser?.id === user?.id && (
                    <span className="label-tip">
                      {intl.formatMessage(messages.discordIdTip, {
                        FindDiscordIdLink: (msg: React.ReactNode) => (
                          <a
                            href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {msg}
                          </a>
                        ),
                      })}
                    </span>
                  )}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field id="discordId" name="discordId" type="text" />
                  </div>
                  {errors.discordId &&
                    touched.discordId &&
                    typeof errors.discordId === 'string' && (
                      <div className="error">{errors.discordId}</div>
                    )}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="locale" className="text-label">
                  {intl.formatMessage(messages.applanguage)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field as="select" id="locale" name="locale">
                      <option value="" lang={locale}>
                        {intl.formatMessage(messages.languageDefault, {
                          language:
                            availableLanguages[currentSettings.locale].display,
                        })}
                      </option>
                      {(
                        Object.keys(
                          availableLanguages
                        ) as (keyof typeof availableLanguages)[]
                      ).map((key) => (
                        <option
                          key={key}
                          value={availableLanguages[key].code}
                          lang={availableLanguages[key].code}
                        >
                          {availableLanguages[key].display}
                        </option>
                      ))}
                    </Field>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="discoverRegion" className="text-label">
                  <span>{intl.formatMessage(messages.discoverRegion)}</span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.discoverRegionTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <RegionSelector
                      name="discoverRegion"
                      value={values.discoverRegion ?? ''}
                      isUserSetting
                      onChange={setFieldValue}
                    />
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="originalLanguage" className="text-label">
                  <span>{intl.formatMessage(messages.originallanguage)}</span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.originallanguageTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <LanguageSelector
                      setFieldValue={setFieldValue}
                      serverValue={currentSettings.originalLanguage}
                      value={values.originalLanguage}
                      isUserSettings
                    />
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="streamingRegionTip" className="text-label">
                  <span>{intl.formatMessage(messages.streamingRegion)}</span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.streamingRegionTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <RegionSelector
                      name="streamingRegion"
                      value={values.streamingRegion || ''}
                      isUserSetting
                      onChange={setFieldValue}
                      regionType="streaming"
                      disableAll
                    />
                  </div>
                </div>
              </div>
              {currentHasPermission(Permission.MANAGE_USERS) &&
                !hasPermission(Permission.MANAGE_USERS) && (
                  <>
                    <div className="form-row">
                      <label htmlFor="movieQuotaLimit" className="text-label">
                        <span>
                          {intl.formatMessage(messages.movierequestlimit)}
                        </span>
                      </label>
                      <div className="form-input-area">
                        <div className="flex flex-col">
                          <div className="mb-4 flex items-center">
                            <input
                              type="checkbox"
                              checked={movieQuotaEnabled}
                              onChange={() => setMovieQuotaEnabled((s) => !s)}
                            />
                            <span className="ml-2 text-gray-300">
                              {intl.formatMessage(messages.enableOverride)}
                            </span>
                          </div>
                          <QuotaSelector
                            isDisabled={!movieQuotaEnabled}
                            dayFieldName="movieQuotaDays"
                            limitFieldName="movieQuotaLimit"
                            mediaType="movie"
                            onChange={setFieldValue}
                            defaultDays={values.movieQuotaDays}
                            defaultLimit={values.movieQuotaLimit}
                            dayOverride={
                              !movieQuotaEnabled
                                ? data?.globalMovieQuotaDays
                                : undefined
                            }
                            limitOverride={
                              !movieQuotaEnabled
                                ? data?.globalMovieQuotaLimit
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <label htmlFor="tvQuotaLimit" className="text-label">
                        <span>
                          {intl.formatMessage(messages.seriesrequestlimit)}
                        </span>
                      </label>
                      <div className="form-input-area">
                        <div className="flex flex-col">
                          <div className="mb-4 flex items-center">
                            <input
                              type="checkbox"
                              checked={tvQuotaEnabled}
                              onChange={() => setTvQuotaEnabled((s) => !s)}
                            />
                            <span className="ml-2 text-gray-300">
                              {intl.formatMessage(messages.enableOverride)}
                            </span>
                          </div>
                          <QuotaSelector
                            isDisabled={!tvQuotaEnabled}
                            dayFieldName="tvQuotaDays"
                            limitFieldName="tvQuotaLimit"
                            mediaType="tv"
                            onChange={setFieldValue}
                            defaultDays={values.tvQuotaDays}
                            defaultLimit={values.tvQuotaLimit}
                            dayOverride={
                              !tvQuotaEnabled
                                ? data?.globalTvQuotaDays
                                : undefined
                            }
                            limitOverride={
                              !tvQuotaEnabled
                                ? data?.globalTvQuotaLimit
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              {hasPermission(
                [Permission.AUTO_REQUEST, Permission.AUTO_REQUEST_MOVIE],
                { type: 'or' }
              ) &&
                user?.userType === UserType.PLEX && (
                  <div className="form-row">
                    <label
                      htmlFor="watchlistSyncMovies"
                      className="checkbox-label"
                    >
                      <span>
                        {intl.formatMessage(messages.plexwatchlistsyncmovies)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(
                          messages.plexwatchlistsyncmoviestip,
                          {
                            PlexWatchlistSupportLink: (
                              msg: React.ReactNode
                            ) => (
                              <a
                                href="https://support.plex.tv/articles/universal-watchlist/"
                                className="text-white transition duration-300 hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {msg}
                              </a>
                            ),
                          }
                        )}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="watchlistSyncMovies"
                        name="watchlistSyncMovies"
                        onChange={() => {
                          setFieldValue(
                            'watchlistSyncMovies',
                            !values.watchlistSyncMovies
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
              {hasPermission(
                [Permission.AUTO_REQUEST, Permission.AUTO_REQUEST_TV],
                { type: 'or' }
              ) &&
                user?.userType === UserType.PLEX && (
                  <div className="form-row">
                    <label htmlFor="watchlistSyncTv" className="checkbox-label">
                      <span>
                        {intl.formatMessage(messages.plexwatchlistsyncseries)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(
                          messages.plexwatchlistsyncseriestip,
                          {
                            PlexWatchlistSupportLink: (
                              msg: React.ReactNode
                            ) => (
                              <a
                                href="https://support.plex.tv/articles/universal-watchlist/"
                                className="text-white transition duration-300 hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {msg}
                              </a>
                            ),
                          }
                        )}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="watchlistSyncTv"
                        name="watchlistSyncTv"
                        onChange={() => {
                          setFieldValue(
                            'watchlistSyncTv',
                            !values.watchlistSyncTv
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
              {(currentHasPermission(Permission.MANAGE_USERS)) && (
                <>
                  <div className="form-row">
                    <label htmlFor="enableCertificationRestrictions" className="checkbox-label">
                      <span>
                        {intl.formatMessage(messages.enableCertificationRestrictions)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(messages.enableCertificationRestrictionsDescription)}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="enableCertificationRestrictions"
                        name="enableCertificationRestrictions"
                        onChange={() => {
                          setFieldValue(
                            'enableCertificationRestrictions',
                            !values.enableCertificationRestrictions
                          );
                        }}
                      />
                    </div>
                  </div>

                  {values.enableCertificationRestrictions && (
                    <>
                      {/* Movie Certifications */}
                      <div className="form-row">
                        <label htmlFor="allowedMovieCertifications" className="text-label">
                          <span>{intl.formatMessage(messages.allowedMovieCertifications)}</span>
                          <span className="label-tip">
                            {intl.formatMessage(messages.allowedMovieCertificationsDescription)}
                          </span>
                        </label>
                        <div className="form-input-area">
                          <div className="mb-2 flex space-x-4">
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue(
                                  'allowedMovieCertifications',
                                  movieCertifications.map(cert => cert.certification)
                                );
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectAll)}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue('allowedMovieCertifications', []);
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectNone)}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {movieCertifications.map((cert) => (
                              <div key={cert.certification} className="flex items-center">
                                <Field
                                  type="checkbox"
                                  id={`movie-cert-${cert.certification}`}
                                  name="allowedMovieCertifications"
                                  value={cert.certification}
                                  checked={values.allowedMovieCertifications.includes(cert.certification)}
                                  onChange={() => {
                                    const currentCerts = values.allowedMovieCertifications as string[];
                                    const newCerts = currentCerts.includes(cert.certification)
                                      ? currentCerts.filter((c: string) => c !== cert.certification)
                                      : [...currentCerts, cert.certification];
                                    setFieldValue('allowedMovieCertifications', newCerts);
                                  }}
                                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`movie-cert-${cert.certification}`} className="ml-2 block text-sm text-gray-100">
                                  <span className="font-medium">{cert.certification}</span> - {cert.meaning}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* TV Certifications */}
                      <div className="form-row">
                        <label htmlFor="allowedTvCertifications" className="text-label">
                          <span>{intl.formatMessage(messages.allowedTvCertifications)}</span>
                          <span className="label-tip">
                            {intl.formatMessage(messages.allowedTvCertificationsDescription)}
                          </span>
                        </label>
                        <div className="form-input-area">
                          <div className="mb-2 flex space-x-4">
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue(
                                  'allowedTvCertifications',
                                  tvCertifications.map(cert => cert.certification)
                                );
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectAll)}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue('allowedTvCertifications', []);
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectNone)}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {tvCertifications.map((cert) => (
                              <div key={cert.certification} className="flex items-center">
                                <Field
                                  type="checkbox"
                                  id={`tv-cert-${cert.certification}`}
                                  name="allowedTvCertifications"
                                  value={cert.certification}
                                  checked={values.allowedTvCertifications.includes(cert.certification)}
                                  onChange={() => {
                                    const currentCerts = values.allowedTvCertifications as string[];
                                    const newCerts = currentCerts.includes(cert.certification)
                                      ? currentCerts.filter((c: string) => c !== cert.certification)
                                      : [...currentCerts, cert.certification];
                                    setFieldValue('allowedTvCertifications', newCerts);
                                  }}
                                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`tv-cert-${cert.certification}`} className="ml-2 block text-sm text-gray-100">
                                  <span className="font-medium">{cert.certification}</span> - {cert.meaning}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="actions">
                <div className="flex justify-end">
                  <span className="ml-3 inline-flex rounded-md shadow-sm">
                    <Button
                      buttonType="primary"
                      type="submit"
                      disabled={isSubmitting || !isValid}
                    >
                      <ArrowDownOnSquareIcon />
                      <span>
                        {isSubmitting
                          ? intl.formatMessage(globalMessages.saving)
                          : intl.formatMessage(globalMessages.save)}
                      </span>
                    </Button>
                  </span>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default UserGeneralSettings;
